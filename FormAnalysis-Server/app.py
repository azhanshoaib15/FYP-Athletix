"""
app.py  --  Form Analysis Inference Server v2
"""
import os
import json
import tempfile
import base64
import logging
import xgboost as xgb
from pathlib import Path
from typing import Optional, List

import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from xgboost import XGBClassifier

from feature_engineering import sequence_to_feature_vector, feature_dim, filter_low_confidence_frames
from rep_counter import RepCounter, count_reps_from_sequence
from camera_validator import validate_camera_frame
from body_analysis import analyze_body_parts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = os.getenv("MODELS_DIR", "./models_v2")
META_DIR   = os.getenv("META_DIR",   "./model_meta_v2")
MANIFEST   = os.path.join(META_DIR, "manifest.json")

app = FastAPI(title="Form Analysis API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ModelRegistry:
    def __init__(self):
        self.models: dict = {}
        self.manifest: dict = {}
        self._load()

    def _load(self):
        if not os.path.exists(MANIFEST):
            logger.warning(f"Manifest not found at {MANIFEST}. No models loaded.")
            return
        with open(MANIFEST) as f:
            self.manifest = json.load(f)
        for exercise, info in self.manifest["exercises"].items():
            model_path = os.path.join(MODELS_DIR, info["model_file"])
            if not os.path.exists(model_path):
                logger.warning(f"Missing: {model_path}")
                continue
            clf = xgb.Booster()
            clf.load_model(model_path)
            self.models[exercise] = clf
            logger.info(f"Loaded: {exercise} (cv_acc={info['cv_accuracy']:.3f})")
        logger.info(f"Loaded {len(self.models)} models")

    def predict(self, exercise: str, feat_vec: np.ndarray) -> dict:
        if exercise not in self.models:
            return {"prediction": "unknown", "confidence": 0.0, "correct_prob": 0.5, "incorrect_prob": 0.5}
        booster = self.models[exercise]
        dmat = xgb.DMatrix(feat_vec[np.newaxis, :])
        prob_correct = float(booster.predict(dmat)[0])
        prob = [1 - prob_correct, prob_correct]
        pred = int(prob_correct >= 0.5)
        return {
            "prediction":    "correct" if pred == 1 else "incorrect",
            "confidence":    float(round(max(prob), 3)),
            "correct_prob":  float(round(prob[1], 3)),
            "incorrect_prob": float(round(prob[0], 3)),
        }

registry = ModelRegistry()

mp_pose = mp.solutions.pose


# Shared pose instance for live check (faster than creating new one each call)
_live_pose = mp_pose.Pose(
    static_image_mode=True,
    model_complexity=1,
    min_detection_confidence=0.40,
    min_tracking_confidence=0.40,
)

def frame_b64_to_keypoints(b64: str) -> Optional[np.ndarray]:
    try:
        img_bytes = base64.b64decode(b64)
        nparr     = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return None
        # Resize frame for faster processing while keeping aspect ratio
        h, w = frame.shape[:2]
        scale = 480 / max(h, w)
        if scale < 1.0:
            frame = cv2.resize(frame, (int(w*scale), int(h*scale)))
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = _live_pose.process(rgb)
        if res.pose_landmarks:
            return np.array([
                v for lm in res.pose_landmarks.landmark
                for v in (lm.x, lm.y, lm.z, lm.visibility)
            ], dtype=np.float32)
        return np.zeros(132, dtype=np.float32)
    except Exception as e:
        logger.warning(f"Frame decode error: {e}")
        return None


def frames_to_sequence(frames_b64: List[str]) -> np.ndarray:
    results = []
    with mp_pose.Pose(static_image_mode=True, model_complexity=1,
                      min_detection_confidence=0.45) as pose:
        for b64 in frames_b64:
            try:
                img_bytes = base64.b64decode(b64)
                nparr     = np.frombuffer(img_bytes, np.uint8)
                frame     = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if frame is None:
                    results.append(np.zeros(132, dtype=np.float32))
                    continue
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                res = pose.process(rgb)
                if res.pose_landmarks:
                    kp = np.array([
                        v for lm in res.pose_landmarks.landmark
                        for v in (lm.x, lm.y, lm.z, lm.visibility)
                    ], dtype=np.float32)
                else:
                    kp = np.zeros(132, dtype=np.float32)
                results.append(kp)
            except Exception:
                results.append(np.zeros(132, dtype=np.float32))
    if not results:
        return np.zeros((1, 132), dtype=np.float32)
    return np.stack(results)


def extract_keypoints_from_video(video_path: str) -> np.ndarray:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")
    frames = []
    with mp_pose.Pose(static_image_mode=False, model_complexity=1,
                      min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            res = pose.process(rgb)
            kp  = (np.array([
                       v for lm in res.pose_landmarks.landmark
                       for v in (lm.x, lm.y, lm.z, lm.visibility)
                   ], dtype=np.float32)
                   if res.pose_landmarks else np.zeros(132, dtype=np.float32))
            frames.append(kp)
    cap.release()
    if not frames:
        raise ValueError("No frames extracted from video")
    return np.stack(frames)


# ── Request / Response models ─────────────────────────────────────────────────

class LiveCheckRequest(BaseModel):
    exercise: str
    latest_frame_b64: str
    recent_frames_b64: List[str]
    total_reps_so_far: int = 0
    accumulated_keypoints: Optional[List[List[float]]] = None  # All keypoints so far


class LiveCheckResponse(BaseModel):
    camera_status:   str
    camera_message:  str
    camera_color:    str
    camera_ready:    bool
    reps_in_window:  int
    form_status:     str
    form_confidence: float
    keypoints:       Optional[List[float]] = None  # ← NEW: return real keypoints to frontend


class FinishRequest(BaseModel):
    exercise: str
    all_keypoints: List[List[float]]
    user_height_cm: Optional[float] = None
    user_weight_kg: Optional[float] = None


class BodyPartIssue(BaseModel):
    body_part:      str
    severity:       str
    issue:          str
    feedback:       str
    mean_angle:     float
    expected_range: List[int]


class FinishResponse(BaseModel):
    exercise:         str
    total_reps:       int
    overall_form:     str
    confidence:       float
    correct_prob:     float
    incorrect_prob:   float
    body_part_issues: List[BodyPartIssue]
    good_parts:       List[str]
    summary:          str
    feedback:         str


def build_finish_feedback(exercise, form, confidence, issues, reps):
    verdict = "good form" if form == "correct" else "some form issues"
    base = f"You completed {reps} rep{'s' if reps != 1 else ''} of {exercise} with {verdict}."
    if issues:
        top = issues[0]
        base += f" Focus on: {top['body_part']} — {top['feedback']}"
    elif form == "correct":
        base += " Excellent work!"
    return base


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": len(registry.models)}


@app.get("/exercises")
def list_exercises():
    exercises = []
    for ex, info in registry.manifest.get("exercises", {}).items():
        exercises.append({
            "name":        ex,
            "available":   ex in registry.models,
            "cv_accuracy": info.get("cv_accuracy"),
            "n_samples":   info.get("n_original"),
        })
    return {"exercises": sorted(exercises, key=lambda e: e["name"])}


@app.post("/live/check", response_model=LiveCheckResponse)
async def live_check(req: LiveCheckRequest):
    from camera_validator import CameraStatus

    # Extract keypoints from latest frame
    latest_kp = frame_b64_to_keypoints(req.latest_frame_b64)

    if latest_kp is not None and latest_kp.sum() > 0:
        cam = validate_camera_frame(latest_kp, req.exercise)
    else:
        cam = CameraStatus(status="low_light",
                           message="Can't detect pose - check lighting",
                           color="red", ready=False)

    reps_in_window = 0
    form_status    = "unknown"
    form_conf      = 0.0

    # ── Rep counting on ALL accumulated keypoints (not just window) ──────────
    # If frontend sends accumulated keypoints, count reps on the full sequence
    if req.accumulated_keypoints and len(req.accumulated_keypoints) >= 5:
        try:
            acc_seq = np.array(req.accumulated_keypoints, dtype=np.float32)
            if acc_seq.shape[1] == 132:
                acc_seq = filter_low_confidence_frames(acc_seq)
                if len(acc_seq) >= 5:
                    rep_info       = count_reps_from_sequence(acc_seq, req.exercise)
                    reps_in_window = rep_info.get("reps", 0)
                    feat_vec       = sequence_to_feature_vector(acc_seq)
                    pred           = registry.predict(req.exercise, feat_vec)
                    form_status    = pred["prediction"]
                    form_conf      = pred["confidence"]
        except Exception as e:
            logger.warning(f"Accumulated keypoints counting error: {e}")

    # Fallback: use recent frames if no accumulated keypoints
    if reps_in_window == 0 and form_status == "unknown" and len(req.recent_frames_b64) >= 5:
        seq = frames_to_sequence(req.recent_frames_b64)
        seq = filter_low_confidence_frames(seq)
        if len(seq) >= 3:
            rep_info       = count_reps_from_sequence(seq, req.exercise)
            reps_in_window = rep_info.get("reps", 0)
            feat_vec       = sequence_to_feature_vector(seq)
            pred           = registry.predict(req.exercise, feat_vec)
            form_status    = pred["prediction"]
            form_conf      = pred["confidence"]

    # Return keypoints back to frontend so it can accumulate for /live/finish
    kp_list = None
    if latest_kp is not None and latest_kp.sum() > 0:
        kp_list = latest_kp.tolist()

    return LiveCheckResponse(
        camera_status   = cam.status,
        camera_message  = cam.message,
        camera_color    = cam.color,
        camera_ready    = cam.ready,
        reps_in_window  = reps_in_window,
        form_status     = form_status,
        form_confidence = form_conf,
        keypoints       = kp_list,
    )


@app.post("/live/finish")
async def live_finish_patched(req: dict):
    """
    Enhanced finish endpoint with comprehensive form analysis.
    Returns confidence, form status, specific body part issues and corrections.
    """
    exercise      = req.get("exercise", "Squats")
    all_keypoints = req.get("all_keypoints", [])

    # ── Filter valid frames using KEY JOINTS only ────────────────────────────
    # Shoulders(11,12) elbows(13,14) wrists(15,16) hips(23,24) knees(25,26) ankles(27,28)
    # Using key joints only — face/finger landmarks drag mean visibility down unfairly
    _KEY_IDX = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

    logger.info(f"Total frames received: {len(all_keypoints)}")

    valid_kp = []
    for kp in all_keypoints:
        arr = np.array(kp, dtype=np.float32)
        if arr.shape[0] == 132:
            vis_key = arr[3::4][[11,12,13,14,15,16,23,24,25,26,27,28]]
            if np.mean(vis_key) >= 0.15:
                valid_kp.append(arr)

    logger.info(f"After key-joint filtering: {len(valid_kp)} valid frames")

    MIN_GOOD_FRAMES = 6  # lowered — real phones get 8-15 frames in 8s

    if len(valid_kp) < MIN_GOOD_FRAMES:
        return {
            "overall_form":    "insufficient_data",
            "confidence":      0.0,
            "feedback":        f"Only {len(valid_kp)} usable frames detected (need {MIN_GOOD_FRAMES}). Record for at least 10-15 seconds with your full body clearly visible.",
            "body_part_issues": [],
            "good_parts":      [],
            "total_reps":      0,
        }

    seq      = np.stack(valid_kp)
    # (valid_kp already filtered — no double filtering)
    logger.info(f"Using {len(seq)} frames for ML analysis")
    feat_vec = sequence_to_feature_vector(seq)
    pred     = registry.predict(exercise, feat_vec)
    confidence  = float(pred["confidence"])
    prediction  = pred["prediction"]   # "correct" or "incorrect"

    # ── Get body part analysis (ALWAYS — even on low confidence) ─────────────
    # analyze_body_parts is rule-based biomechanics — it works regardless of
    # model confidence because it directly measures joint angles from keypoints
    user_height = req.get("user_height_cm") if isinstance(req, dict) else getattr(req, "user_height_cm", None)
    user_weight = req.get("user_weight_kg") if isinstance(req, dict) else getattr(req, "user_weight_kg", None)
    body_issues_raw = analyze_body_parts(seq, exercise, user_height_cm=user_height, user_weight_kg=user_weight)
    issues     = body_issues_raw.get("issues", [])
    good_parts = body_issues_raw.get("good_parts", [])
    rep_count  = body_issues_raw.get("rep_count", 0)

    # ── Low confidence: still return body part analysis, just flag it ─────────
    if confidence < 0.30:
        conf_note = f" (Model confidence: {round(confidence*100)}% — record for longer with full body visible for higher accuracy)"
        if issues:
            feedback = f"Partial analysis complete. Found {len(issues)} form issue(s) to work on.{conf_note}"
        elif good_parts:
            feedback = f"Your positioning looks good! {conf_note}"
        else:
            feedback = f"Analysis confidence is low ({round(confidence*100)}%). Ensure full body is visible, use good lighting, and record for at least 10 seconds."
        return {
            "overall_form":    "uncertain",
            "confidence":      confidence,
            "feedback":        feedback,
            "body_part_issues": issues,   # ← NOW returns actual body part issues
            "good_parts":      good_parts, # ← NOW returns good parts too
            "total_reps":      rep_count,
        }

    # ── Compute joint angles for specific feedback ────────────────────────────
    # Calculate average angles from sequence for detailed feedback
    def get_avg_angle(kp_seq, a, b, c):
        """Average angle at joint b across all frames."""
        try:
            angles = []
            for frame in kp_seq:
                # Each landmark is x,y,z,visibility (4 values)
                pa = frame[a*4:a*4+3]
                pb = frame[b*4:b*4+3]
                pc = frame[c*4:c*4+3]
                v1 = pa - pb
                v2 = pc - pb
                cos_a = np.dot(v1,v2) / (np.linalg.norm(v1)*np.linalg.norm(v2)+1e-6)
                angles.append(np.degrees(np.arccos(np.clip(cos_a,-1,1))))
            return float(np.mean(angles))
        except:
            return None

    # MediaPipe landmark indices
    # 11=L_shoulder 12=R_shoulder 13=L_elbow 14=R_elbow
    # 15=L_wrist 16=R_wrist 23=L_hip 24=R_hip
    # 25=L_knee 26=R_knee 27=L_ankle 28=R_ankle

    exercise_feedback = {
        "Squats": {
            "correct":   "Excellent squat! Good depth, knees tracking over toes, back straight.",
            "incorrect": "Squat needs improvement. Focus on depth and knee alignment.",
            "joints":    [(23,25,27,"Left knee angle","80-100° at bottom"), (24,26,28,"Right knee angle","80-100° at bottom")],
            "tips":      ["Go deeper — thighs parallel to floor", "Keep chest up and back straight", "Push knees outward, don't let them cave in", "Keep heels on the floor throughout"],
        },
        "Push-up": {
            "correct":   "Perfect push-up! Body in straight line, full range of motion.",
            "incorrect": "Push-up form needs work. Check your body alignment.",
            "joints":    [(11,13,15,"Left elbow angle","90° at bottom"), (12,14,16,"Right elbow angle","90° at bottom")],
            "tips":      ["Keep body in straight line — no sagging hips", "Lower chest to floor level", "Keep elbows at 45° to body, not flared out", "Full lockout at the top"],
        },
        "Bicep curl": {
            "correct":   "Great bicep curl! Full range of motion, elbows stationary.",
            "incorrect": "Bicep curl needs improvement. Elbow movement detected.",
            "joints":    [(11,13,15,"Left arm angle","30-150° range"), (12,14,16,"Right arm angle","30-150° range")],
            "tips":      ["Keep elbows pinned to sides — don't let them swing forward", "Full curl — bring weight to shoulder level", "Control the descent — don't drop the weight", "Keep wrists neutral, don't bend them"],
        },
        "Bench Press": {
            "correct":   "Solid bench press! Good bar path and chest contact.",
            "incorrect": "Bench press form needs attention.",
            "joints":    [(11,13,15,"Left elbow angle","90° at bottom")],
            "tips":      ["Lower bar to mid-chest, not neck or stomach", "Keep feet flat on floor", "Arch lower back slightly, keep shoulder blades retracted", "Bar should touch chest at bottom"],
        },
        "Lunges": {
            "correct":   "Great lunge! 90° knee angles, good balance and depth.",
            "incorrect": "Lunge form needs correction. Check knee and torso position.",
            "joints":    [(23,25,27,"Front knee angle","90° at bottom"), (24,26,28,"Back knee angle","near 90° at bottom")],
            "tips":      ["Front knee should not go past toes", "Keep torso upright — don't lean forward", "Both knees should reach 90° at bottom", "Push through front heel to return to standing"],
        },
        "Plank": {
            "correct":   "Perfect plank! Straight body line, core engaged.",
            "incorrect": "Plank position needs adjustment. Body not in straight line.",
            "joints":    [(11,23,25,"Hip angle","180° for straight line")],
            "tips":      ["Keep hips level — don't sag or raise them", "Engage core — pull belly button toward spine", "Keep neck neutral — don't look up or down", "Squeeze glutes for better stability"],
        },
        "Shoulder press": {
            "correct":   "Excellent shoulder press! Full overhead lockout achieved.",
            "incorrect": "Shoulder press needs work. Check your range of motion.",
            "joints":    [(11,13,15,"Left arm angle","180° at top"), (12,14,16,"Right arm angle","180° at top")],
            "tips":      ["Press directly overhead, not forward", "Full lockout at top — arms straight", "Keep core tight to prevent back arch", "Lower to ear level at bottom"],
        },
        "Deadlift": {
            "correct":   "Strong deadlift! Good hip hinge and back position.",
            "incorrect": "Deadlift form needs improvement. Back position is critical.",
            "joints":    [(11,23,25,"Hip hinge angle","check range")],
            "tips":      ["Keep back straight — no rounding", "Hip hinge movement, not a squat", "Bar stays close to body throughout", "Drive through heels, squeeze glutes at top"],
        },
        "Lat Pulldown": {
            "correct":   "Good lat pulldown! Bar reaching upper chest.",
            "incorrect": "Lat pulldown needs improvement.",
            "joints":    [(11,13,15,"Elbow angle at bottom","90°")],
            "tips":      ["Pull bar to upper chest, not behind neck", "Lean back slightly — 20-30°", "Lead with elbows, not hands", "Fully extend arms at top"],
        },
        "Pull-ups": {
            "correct":   "Great pull-up! Full range of motion, chin over bar.",
            "incorrect": "Pull-up needs more range of motion.",
            "joints":    [(11,13,15,"Left elbow angle","fully extended at bottom")],
            "tips":      ["Start from dead hang — arms fully extended", "Pull until chin clears the bar", "Avoid swinging or kipping", "Control the descent — don't drop"],
        },
    }

    ex_info   = exercise_feedback.get(exercise, {
        "correct":   f"Good {exercise} form!",
        "incorrect": f"Your {exercise} form needs improvement.",
        "tips":      ["Maintain proper posture", "Full range of motion", "Control the movement"],
    })

    # Build personalized feedback using actual measured joint angles
    if prediction == "correct":
        main_feedback = ex_info["correct"]
        if confidence >= 0.8:
            main_feedback += f" Confidence: {round(confidence*100)}% — excellent execution!"
        elif confidence >= 0.6:
            main_feedback += f" Confidence: {round(confidence*100)}% — keep it up!"
        else:
            main_feedback += f" Confidence: {round(confidence*100)}%."
    else:
        main_feedback = ex_info["incorrect"]
        main_feedback += f" (Confidence: {round(confidence*100)}%)"

    # Add SPECIFIC angle-based corrections if issues found
    if prediction == "incorrect" and issues:
        top_issues = issues[:2]
        corrections = " | ".join([f"{iss['body_part']}: {iss['feedback']} (your angle: {iss['mean_angle']}°, target: {iss['expected_range'][0]}-{iss['expected_range'][1]}°)" for iss in top_issues])
        main_feedback += f" Fix: {corrections}"
    elif prediction == "incorrect" and not issues:
        tips = ex_info.get("tips", [])
        if tips:
            main_feedback += " Key corrections: " + " | ".join(tips[:2])

    # Build comprehensive good_parts if correct
    if prediction == "correct" and not good_parts:
        good_parts = [
            f"Overall {exercise} technique",
            "Body alignment and posture",
            "Range of motion",
            "Movement control and stability",
        ]
    elif prediction == "incorrect" and not issues:
        # Build issues from tips
        tips = ex_info.get("tips", [])
        issues = [
            {"body_part": f"Form correction {i+1}", "severity": "medium", "feedback": tip}
            for i, tip in enumerate(tips[:3])
        ]

    return {
        "overall_form":    prediction,
        "confidence":      confidence,
        "feedback":        main_feedback,
        "body_part_issues": issues,
        "good_parts":      good_parts,
        "total_reps":      rep_count,
    }



@app.post("/live/finish", response_model=FinishResponse)
async def live_finish(req: FinishRequest):
    if len(req.all_keypoints) < 3:
        raise HTTPException(422, "Need at least 3 frames. Hold the exercise longer and try again.")

    seq = np.array(req.all_keypoints, dtype=np.float32)
    if seq.shape[1] != 132:
        raise HTTPException(422, f"Expected 132 keypoints per frame, got {seq.shape[1]}")

    seq      = filter_low_confidence_frames(seq)
    feat_vec = sequence_to_feature_vector(seq)
    pred     = registry.predict(req.exercise, feat_vec)
    rep_info = count_reps_from_sequence(seq, req.exercise)
    body     = analyze_body_parts(seq, req.exercise)

    total_reps = body.get("rep_count") or rep_info.get("reps", 0)
    issues     = [BodyPartIssue(**i) for i in body.get("issues", [])]

    return FinishResponse(
        exercise         = req.exercise,
        total_reps       = total_reps,
        overall_form     = pred["prediction"],
        confidence       = pred["confidence"],
        correct_prob     = pred["correct_prob"],
        incorrect_prob   = pred["incorrect_prob"],
        body_part_issues = issues,
        good_parts       = body.get("good_parts", []),
        summary          = body.get("summary", ""),
        feedback         = build_finish_feedback(
            req.exercise, pred["prediction"], pred["confidence"],
            body.get("issues", []), total_reps),
    )


@app.post("/analyze/video")
async def analyze_video(file: UploadFile = File(...), exercise: str = Form(...)):
    suffix = Path(file.filename).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        seq      = extract_keypoints_from_video(tmp_path)
        seq      = filter_low_confidence_frames(seq)
        if len(seq) < 10:
            raise HTTPException(422, "Video too short or pose not detected.")
        feat_vec = sequence_to_feature_vector(seq)
        pred     = registry.predict(exercise, feat_vec)
        rep_info = count_reps_from_sequence(seq, exercise)
        body     = analyze_body_parts(seq, exercise)
        total_reps = body.get("rep_count") or rep_info.get("reps", 0)
        issues   = [BodyPartIssue(**i) for i in body.get("issues", [])]
        return FinishResponse(
            exercise         = exercise,
            total_reps       = total_reps,
            overall_form     = pred["prediction"],
            confidence       = pred["confidence"],
            correct_prob     = pred["correct_prob"],
            incorrect_prob   = pred["incorrect_prob"],
            body_part_issues = issues,
            good_parts       = body.get("good_parts", []),
            summary          = body.get("summary", ""),
            feedback         = build_finish_feedback(exercise, pred["prediction"],
                                   pred["confidence"], body.get("issues", []), total_reps),
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)