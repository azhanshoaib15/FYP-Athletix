"""
app.py  --  Form Analysis Inference Server v2
---------------------------------------------
Endpoints:
  POST /live/check    -> send latest frame + recent frames, get camera status + rep count + live form
  POST /live/finish   -> end session, get full analysis with body part breakdown
  POST /analyze/video -> upload video file (non-live path)
  GET  /exercises     -> list supported exercises
  GET  /health        -> health check

Run:
  pip install -r requirements.txt
  python app.py
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

# -- Config -------------------------------------------------------------------
MODELS_DIR = os.getenv("MODELS_DIR", "./models_v2")
META_DIR   = os.getenv("META_DIR",   "./model_meta_v2")
MANIFEST   = os.path.join(META_DIR, "manifest.json")

# -- App ----------------------------------------------------------------------
app = FastAPI(title="Form Analysis API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# -- Model registry -----------------------------------------------------------
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
            return {"prediction": "unknown", "confidence": 0.0,
                    "correct_prob": 0.5, "incorrect_prob": 0.5}
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

# -- MediaPipe ----------------------------------------------------------------
mp_pose = mp.solutions.pose


def frame_b64_to_keypoints(b64: str) -> Optional[np.ndarray]:
    """Decode one base64 frame -> (132,) keypoints. Returns None on failure."""
    try:
        img_bytes = base64.b64decode(b64)
        nparr     = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return None
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        with mp_pose.Pose(static_image_mode=True, model_complexity=1,
                          min_detection_confidence=0.45) as pose:
            res = pose.process(rgb)
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
    """Convert list of base64 frames -> (frames, 132) sequence."""
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
                      min_detection_confidence=0.5,
                      min_tracking_confidence=0.5) as pose:
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


# -- Request / Response models ------------------------------------------------

class LiveCheckRequest(BaseModel):
    exercise: str
    latest_frame_b64: str
    recent_frames_b64: List[str]
    total_reps_so_far: int = 0


class LiveCheckResponse(BaseModel):
    camera_status:   str
    camera_message:  str
    camera_color:    str
    camera_ready:    bool
    reps_in_window:  int
    form_status:     str
    form_confidence: float


class FinishRequest(BaseModel):
    exercise: str
    all_keypoints: List[List[float]]


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


# -- Helpers ------------------------------------------------------------------

def build_finish_feedback(exercise, form, confidence, issues, reps):
    verdict = "good form" if form == "correct" else "some form issues"
    base = f"You completed {reps} rep{'s' if reps != 1 else ''} of {exercise} with {verdict}."
    if issues:
        top  = issues[0]
        base += f" Focus on: {top['body_part']} — {top['feedback']}"
    elif form == "correct":
        base += " Excellent work!"
    return base


# -- Endpoints ----------------------------------------------------------------

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
    """
    Called every ~500ms during a live session.
    Returns camera guidance, rep delta, and running form status.
    """
    from camera_validator import CameraStatus

    # Camera check
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

    if len(req.recent_frames_b64) >= 10:
        seq = frames_to_sequence(req.recent_frames_b64)
        seq = filter_low_confidence_frames(seq)
        if len(seq) >= 5:
            rep_info       = count_reps_from_sequence(seq, req.exercise)
            reps_in_window = rep_info.get("reps", 0)
            feat_vec       = sequence_to_feature_vector(seq)
            pred           = registry.predict(req.exercise, feat_vec)
            form_status    = pred["prediction"]
            form_conf      = pred["confidence"]

    return LiveCheckResponse(
        camera_status   = cam.status,
        camera_message  = cam.message,
        camera_color    = cam.color,
        camera_ready    = cam.ready,
        reps_in_window  = reps_in_window,
        form_status     = form_status,
        form_confidence = form_conf,
    )


@app.post("/live/finish", response_model=FinishResponse)
async def live_finish(req: FinishRequest):
    """End of session - full analysis on all accumulated keypoints."""
    if len(req.all_keypoints) < 5:
        raise HTTPException(422, "Need at least 5 frames. Hold the exercise longer and try again.")

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