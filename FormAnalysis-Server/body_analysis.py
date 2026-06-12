"""
body_analysis.py
----------------
Post-set analysis: given a sequence of joint angles from an exercise,
identifies WHICH body parts had form issues and provides specific feedback.

Approach:
  1. Extract angle sequence for the full set
  2. Segment the set into individual reps (using rep_counter)
  3. For each angle, compare its distribution to expected "good form" ranges
  4. Rank angles by deviation severity
  5. Map deviating angles → body part names + specific feedback messages

This does NOT require model inference — it's rule-based biomechanics.
The XGBoost model gives the overall correct/incorrect verdict.
This module explains WHY it's incorrect.
"""

import numpy as np
from typing import List
from feature_engineering import ANGLE_NAMES, angles_for_sequence
from rep_counter import count_reps_from_sequence, REP_CONFIG

# ── Expected angle ranges for good form ──────────────────────────────────────
#
# Format: { exercise: { angle_name: (min_good, max_good, weight) } }
#
# weight: 1.0 = critical (always report), 0.5 = secondary (report if severe)
# Ranges represent the MEAN angle across a rep cycle for correct form.

GOOD_FORM_RANGES = {
    # ── Ranges calibrated to REAL MediaPipe angle measurements ──
    # MediaPipe uses 3D (x,y,z) so angles are larger than expected
    # e.g. deep squat knee = ~115-135° (not 90° as in textbooks)
    "Squats": {
        "right_knee":    (100, 145, 1.0),  # deep squat: 115-135° in MediaPipe
        "left_knee":     (100, 145, 1.0),
        "right_hip":     (100, 155, 1.0),  # hip hinge: 110-150° in MediaPipe
        "left_hip":      (100, 155, 1.0),
        "right_trunk":   (150, 180, 0.8),  # upright torso
        "left_trunk":    (150, 180, 0.8),
    },
    "PushUp": {
        "right_elbow":   (80,  130, 1.0),  # elbow at chest: ~90-120°
        "left_elbow":    (80,  130, 1.0),
        "right_trunk":   (155, 180, 1.0),  # straight body line
        "left_trunk":    (155, 180, 1.0),
        "right_hip":     (150, 180, 0.8),  # hips not sagging
    },
    "Bicep curl": {
        "right_elbow":   (60,  110, 1.0),  # curled: 65-100° in MediaPipe
        "right_shoulder_arm": (10, 45, 0.7), # elbow stays at side
        "left_shoulder_arm":  (10, 45, 0.7),
    },
    "Shoulder press": {
        "right_elbow":   (155, 180, 1.0),  # full overhead extension
        "left_elbow":    (155, 180, 1.0),
        "right_trunk":   (155, 180, 0.8),  # no back arch
        "left_trunk":    (155, 180, 0.8),
    },
    "Lateral Raises": {
        "right_shoulder_arm": (70, 110, 1.0), # arm at shoulder height
        "left_shoulder_arm":  (70, 110, 1.0),
        "right_elbow":        (155, 180, 0.6), # slight bend ok
    },
    "Bench Press": {
        "right_elbow":   (75,  115, 1.0),  # bar to chest
        "left_elbow":    (75,  115, 1.0),
        "right_shoulder_arm": (30, 65, 0.7),
        "left_shoulder_arm":  (30, 65, 0.7),
    },
    "Incline beanch Press": {
        "right_elbow":   (80,  120, 1.0),
        "left_elbow":    (80,  120, 1.0),
        "right_shoulder_arm": (35, 70, 0.7),
        "left_shoulder_arm":  (35, 70, 0.7),
    },
    "Lat Pulldown": {
        "right_elbow":   (70,  110, 1.0),  # bar pulled to chest
        "right_trunk":   (150, 178, 0.7),  # slight lean back
    },
    "BackRows": {
        "right_elbow":   (75,  115, 1.0),
        "right_trunk":   (140, 175, 0.8),
    },
    "Lunges": {
        "right_knee":    (100, 145, 1.0),  # same as squat depth
        "left_knee":     (100, 145, 1.0),
        "right_trunk":   (150, 180, 0.8),  # upright torso
    },
    "Leg Press": {
        "right_knee":    (80,  120, 1.0),
        "left_knee":     (80,  120, 1.0),
    },
    "Tricep pushdown": {
        "right_elbow":   (155, 180, 1.0),  # full lockout
        "right_shoulder_arm": (8, 30, 0.7), # elbows at sides
    },
    "Tricep Dips": {
        "right_elbow":   (80,  115, 1.0),
        "right_trunk":   (150, 180, 0.7),
    },
    "Pull Ups": {
        "right_elbow":   (65,  105, 1.0),
        "right_shoulder_arm": (25, 70, 0.8),
    },
    "Chest Fly": {
        "right_shoulder_arm": (15, 55, 1.0),
        "left_shoulder_arm":  (15, 55, 1.0),
        "right_elbow":        (155, 180, 0.6),
    },
    "Leg Raises": {
        "right_hip":     (80,  130, 1.0),  # legs raised
        "right_knee":    (155, 180, 0.7),  # legs straight
    },
    "Plank": {
        "right_trunk":   (160, 180, 1.0),
        "left_trunk":    (160, 180, 1.0),
        "right_hip":     (158, 180, 1.0),
    },
}


# ── Body part name mapping + fix descriptions ─────────────────────────────────

ANGLE_TO_BODY_PART = {
    "right_elbow":        "Right Elbow",
    "left_elbow":         "Left Elbow",
    "right_shoulder_arm": "Right Shoulder",
    "left_shoulder_arm":  "Left Shoulder",
    "right_shoulder_elev":"Right Shoulder Elevation",
    "left_shoulder_elev": "Left Shoulder Elevation",
    "right_knee":         "Right Knee",
    "left_knee":          "Left Knee",
    "right_hip":          "Right Hip",
    "left_hip":           "Left Hip",
    "right_trunk":        "Core / Spine",
    "left_trunk":         "Core / Spine",
}

# Feedback messages: keyed by (angle, issue_type)
# issue_type: "too_low" = angle below good range, "too_high" = above good range
FEEDBACK_MESSAGES = {
    # Knees
    ("right_knee",  "too_high"): "Not squatting deep enough — aim for 90° at the knee",
    ("left_knee",   "too_high"): "Left knee not bending fully — check your stance",
    ("right_knee",  "too_low"):  "Knees going past safe range — reduce depth",
    # Hips
    ("right_hip",   "too_high"): "Not hinging enough at the hips",
    ("right_hip",   "too_low"):  "Hips dropping too low — control your descent",
    # Elbows
    ("right_elbow", "too_high"): "Not reaching full range of motion — lower all the way down",
    ("left_elbow",  "too_high"): "Left arm not reaching full range — check elbow bend",
    ("right_elbow", "too_low"):  "Elbows bending past 90° — lighten the weight",
    # Shoulders
    ("right_shoulder_arm", "too_high"): "Shoulders rising too high — keep them down and stable",
    ("right_shoulder_arm", "too_low"):  "Arms not raising high enough — reach shoulder height",
    ("left_shoulder_arm",  "too_high"): "Left shoulder rising — keep it packed",
    ("left_shoulder_arm",  "too_low"):  "Left arm not raising fully",
    # Trunk/Core
    ("right_trunk", "too_low"):  "Back rounding — brace your core and keep a neutral spine",
    ("left_trunk",  "too_low"):  "Back rounding on left side — engage your core",
    ("right_trunk", "too_high"): "Excessive back arch — tuck your pelvis slightly",
    # Generic fallback
    ("_default",    "too_low"):  "Range of motion too restricted — work on flexibility",
    ("_default",    "too_high"): "Check your form for this movement pattern",
}


def _get_feedback(angle_name: str, issue_type: str) -> str:
    key = (angle_name, issue_type)
    if key in FEEDBACK_MESSAGES:
        return FEEDBACK_MESSAGES[key]
    return FEEDBACK_MESSAGES[("_default", issue_type)]


# ── Main analysis function ────────────────────────────────────────────────────

def analyze_body_parts(seq: np.ndarray, exercise: str,
                       user_height_cm: float = None,
                       user_weight_kg: float = None) -> dict:
    """
    Analyse a full set sequence and return per-body-part feedback.

    Parameters
    ----------
    seq      : (frames, 132) full set sequence
    exercise : exercise name

    Returns
    -------
    {
      "issues": [
        {
          "body_part": "Right Knee",
          "severity":  "high" | "medium" | "low",
          "issue":     "too_high" | "too_low",
          "feedback":  "Not squatting deep enough — aim for 90° at the knee",
          "mean_angle": 128.4,
          "expected_range": [70, 110],
        },
        ...
      ],
      "good_parts": ["Core / Spine", ...],
      "rep_count": 8,
      "summary": "3 form issues detected: Right Knee, Right Hip, Core / Spine"
    }
    """
    if len(seq) < 10:
        return {"issues": [], "good_parts": [], "rep_count": 0,
                "summary": "Not enough data for detailed analysis"}

    # ── Personalise angle ranges based on user height ─────────────────────────
    # Taller people (>180cm) have longer limbs → naturally wider joint angles
    # Shorter people (<160cm) have shorter limbs → naturally tighter angles
    # Reference height: 170cm (neutral). Each 10cm = ~5° adjustment on key joints
    height_adj = 0.0
    if user_height_cm and 130 <= user_height_cm <= 230:
        height_adj = (user_height_cm - 170.0) / 10.0 * 5.0  # ±5° per 10cm

    # Get expected ranges for this exercise
    raw_ranges = GOOD_FORM_RANGES.get(exercise, {})

    # Apply height adjustment to knee and hip angles (leg length dependent)
    # Arm angles are less height-dependent so smaller adjustment
    ranges = {}
    for angle_name, (mn, mx, weight) in raw_ranges.items():
        if angle_name in ("right_knee", "left_knee", "right_hip", "left_hip"):
            adj = height_adj * 1.0   # full adjustment for leg joints
        elif angle_name in ("right_elbow", "left_elbow"):
            adj = height_adj * 0.3   # small adjustment for arm joints
        else:
            adj = 0.0
        ranges[angle_name] = (mn + adj, mx + adj, weight)
    if not ranges:
        return {"issues": [], "good_parts": [], "rep_count": 0,
                "summary": "Detailed body part analysis not available for this exercise yet"}

    # Extract angle sequence
    angle_seq = angles_for_sequence(seq)   # (frames, N_ANGLES)

    # Get rep count
    rep_info  = count_reps_from_sequence(seq, exercise)
    rep_count = rep_info.get("reps", 0)

    issues     = []
    good_parts = set()
    seen_parts = set()   # avoid duplicate body part reports

    # Exercises where we check MINIMUM angle (did they reach the depth?)
    # rather than mean angle (which averages standing + moving frames)
    DEPTH_EXERCISES = {"Squats", "Lunges", "PushUp", "Bicep curl",
                       "Leg Press", "Tricep Dips", "Pull Ups", "Bench Press",
                       "Incline beanch Press", "Lat Pulldown", "BackRows",
                       "Tricep pushdown"}
    # Joints where depth/range matters — use min angle
    DEPTH_JOINTS = {"right_knee","left_knee","right_elbow","left_elbow",
                    "right_hip","left_hip","right_shoulder_arm","left_shoulder_arm"}
    use_min = exercise in DEPTH_EXERCISES

    for angle_name, (min_good, max_good, weight) in ranges.items():
        angle_idx = ANGLE_NAMES.index(angle_name)
        angle_vals = angle_seq[:, angle_idx]

        # For depth exercises: use min angle for joints that must reach a position
        # For stability (plank, trunk): use mean angle
        if use_min and angle_name in DEPTH_JOINTS:
            check_angle = float(angle_vals.min())   # did they reach the depth?
            mean_angle  = float(angle_vals.mean())  # still show mean in feedback
        else:
            check_angle = float(angle_vals.mean())
            mean_angle  = check_angle

        body_part = ANGLE_TO_BODY_PART.get(angle_name, angle_name)

        if check_angle < min_good:
            deviation = min_good - check_angle
            issue_type = "too_low"
        elif check_angle > max_good:
            deviation = check_angle - max_good
            issue_type = "too_high"
        else:
            # Within good range
            if body_part not in seen_parts:
                good_parts.add(body_part)
            seen_parts.add(body_part)
            continue

        # Determine severity
        range_size = max(max_good - min_good, 1)
        ratio = deviation / range_size
        if ratio > 0.6:
            severity = "high"
        elif ratio > 0.25:
            severity = "medium"
        else:
            severity = "low"

        # Skip low-severity secondary angles
        if severity == "low" and weight < 0.8:
            if body_part not in seen_parts:
                good_parts.add(body_part)
            seen_parts.add(body_part)
            continue

        # Remove from good if now found to have issues
        good_parts.discard(body_part)
        seen_parts.add(body_part)

        issues.append({
            "body_part":      body_part,
            "severity":       severity,
            "issue":          issue_type,
            "feedback":       _get_feedback(angle_name, issue_type),
            "mean_angle":     round(check_angle, 1),  # min for depth exercises
            "expected_range": [min_good, max_good],
        })

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda x: severity_order[x["severity"]])

    # Deduplicate body parts (keep worst severity per part)
    seen = {}
    deduped = []
    for issue in issues:
        part = issue["body_part"]
        if part not in seen:
            seen[part] = True
            deduped.append(issue)

    n_issues = len(deduped)
    if n_issues == 0:
        summary = "Great form overall — no major issues detected"
    elif n_issues == 1:
        summary = f"1 form issue detected: {deduped[0]['body_part']}"
    else:
        parts = ", ".join(i["body_part"] for i in deduped[:3])
        summary = f"{n_issues} form issues detected: {parts}"

    return {
        "issues":     deduped,
        "good_parts": sorted(good_parts),
        "rep_count":  rep_count,
        "summary":    summary,
    }