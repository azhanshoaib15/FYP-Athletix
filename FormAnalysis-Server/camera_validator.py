"""
camera_validator.py
-------------------
Validates whether the camera is positioned correctly for a given exercise.

Returns one of:
  "good"         → border green,   "You're all set!"
  "too_far"      → border yellow,  "Move camera closer"
  "too_close"    → border yellow,  "Move camera further away"
  "move_back"    → border red,     "Step back — feet not visible"
  "move_forward" → border red,     "Move closer — can't see your full upper body"
  "rotate"       → border red,     "Turn to face the camera"
  "low_light"    → border red,     "Too dark — find better lighting"
  "blocked"      → border red,     "Body partially blocked"

How it works:
  1. Check overall visibility of required landmarks for this exercise
  2. Check that required landmarks are within frame bounds (not cropped)
  3. Check body scale (landmarks should occupy a sensible fraction of frame)
  4. Return status + human-readable message

MediaPipe landmark indices used:
  0=nose, 11=left_shoulder, 12=right_shoulder,
  23=left_hip, 24=right_hip, 25=left_knee, 26=right_knee,
  27=left_ankle, 28=right_ankle, 15=left_wrist, 16=right_wrist
"""

import numpy as np
from dataclasses import dataclass
from typing import List

# ── Landmark index groups ─────────────────────────────────────────────────────

LM_NOSE           = 0
LM_LEFT_SHOULDER  = 11
LM_RIGHT_SHOULDER = 12
LM_LEFT_ELBOW     = 13
LM_RIGHT_ELBOW    = 14
LM_LEFT_WRIST     = 15
LM_RIGHT_WRIST    = 16
LM_LEFT_HIP       = 23
LM_RIGHT_HIP      = 24
LM_LEFT_KNEE      = 25
LM_RIGHT_KNEE     = 26
LM_LEFT_ANKLE     = 27
LM_RIGHT_ANKLE    = 28
LM_LEFT_HEEL      = 29
LM_RIGHT_HEEL     = 30

UPPER_BODY = [LM_NOSE, LM_LEFT_SHOULDER, LM_RIGHT_SHOULDER,
              LM_LEFT_ELBOW, LM_RIGHT_ELBOW, LM_LEFT_WRIST, LM_RIGHT_WRIST]

LOWER_BODY = [LM_LEFT_HIP, LM_RIGHT_HIP,
              LM_LEFT_KNEE, LM_RIGHT_KNEE,
              LM_LEFT_ANKLE, LM_RIGHT_ANKLE]

FULL_BODY  = UPPER_BODY + LOWER_BODY

TORSO = [LM_LEFT_SHOULDER, LM_RIGHT_SHOULDER, LM_LEFT_HIP, LM_RIGHT_HIP]


# ── Per-exercise camera requirements ─────────────────────────────────────────

CAMERA_CONFIG = {
    # Full body exercises — need head to ankle
    "Squats":              {"required": FULL_BODY,  "min_body_height": 0.60},
    "Lunges":              {"required": FULL_BODY,  "min_body_height": 0.60},
    "Leg Press":           {"required": FULL_BODY,  "min_body_height": 0.55},
    "Leg Extension":       {"required": LOWER_BODY + [LM_LEFT_HIP, LM_RIGHT_HIP],
                                                     "min_body_height": 0.50},
    "Leg Raises":          {"required": FULL_BODY,  "min_body_height": 0.60},
    "PushUp":              {"required": FULL_BODY,  "min_body_height": 0.40},  # horizontal
    "Plank":               {"required": FULL_BODY,  "min_body_height": 0.30},  # horizontal

    # Upper body — shoulders to wrists at minimum
    "Bicep curl":          {"required": UPPER_BODY, "min_body_height": 0.45},
    "Shoulder press":      {"required": UPPER_BODY, "min_body_height": 0.45},
    "Lateral Raises":      {"required": UPPER_BODY, "min_body_height": 0.45},
    "Tricep pushdown":     {"required": UPPER_BODY, "min_body_height": 0.40},
    "Tricep Dips":         {"required": UPPER_BODY + [LM_LEFT_HIP, LM_RIGHT_HIP],
                                                     "min_body_height": 0.55},
    "Pull Ups":            {"required": FULL_BODY,  "min_body_height": 0.50},

    # Chest / back — need torso + arms
    "Bench Press":         {"required": UPPER_BODY, "min_body_height": 0.35},
    "Incline beanch Press":{"required": UPPER_BODY, "min_body_height": 0.35},
    "Chest Fly":           {"required": UPPER_BODY, "min_body_height": 0.35},
    "BackRows":            {"required": UPPER_BODY + [LM_LEFT_HIP, LM_RIGHT_HIP],
                                                     "min_body_height": 0.50},
    "Lat Pulldown":        {"required": UPPER_BODY, "min_body_height": 0.45},
}

# Fallback config if exercise not listed
DEFAULT_CONFIG = {"required": UPPER_BODY + TORSO, "min_body_height": 0.45}


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class CameraStatus:
    status: str          # "good" | "too_far" | "too_close" | "blocked" | ...
    message: str
    color: str           # "green" | "yellow" | "red"
    ready: bool          # True only when status == "good"


# ── Main validator ────────────────────────────────────────────────────────────

def validate_camera_frame(frame_132: np.ndarray, exercise: str) -> CameraStatus:
    """
    Validate a single (132,) MediaPipe frame for the given exercise.
    Returns CameraStatus with status, message, color, and ready flag.
    """
    lm = frame_132.reshape(33, 4)   # (33, landmark) with [x, y, z, visibility]

    config = CAMERA_CONFIG.get(exercise, DEFAULT_CONFIG)
    required_indices = config["required"]
    min_body_height  = config["min_body_height"]

    # ── 1. Check visibility of required landmarks ──────────────────────────
    visibilities = lm[required_indices, 3]
    mean_vis = float(visibilities.mean())
    low_vis_count = int((visibilities < 0.4).sum())

    if mean_vis < 0.10:
        return CameraStatus(
            status="low_light",
            message="Too dark or body not detected — find better lighting",
            color="red",
            ready=False,
        )

    if low_vis_count > len(required_indices) * 0.7:
        # More than 40% of required landmarks invisible
        # Figure out which region is missing
        missing = _identify_missing_region(lm, required_indices, exercise)
        return CameraStatus(
            status="blocked",
            message=missing,
            color="red",
            ready=False,
        )

    # ── 2. Check landmarks are within frame bounds (not cropped) ──────────
    coords = lm[required_indices, :2]   # (n, 2) x,y in [0,1]
    margin = 0.05

    out_of_frame = np.any((coords < margin) | (coords > 1 - margin), axis=1)
    out_count = int(out_of_frame.sum())

    if out_count > 2:
        # Find which direction things are going out
        direction_msg = _out_of_frame_message(lm, required_indices)
        return CameraStatus(
            status="reposition",
            message=direction_msg,
            color="red",
            ready=False,
        )

    # ── 3. Check body scale (too far / too close) ──────────────────────────
    # Use shoulder-to-ankle (or shoulder-to-hip) vertical span
    body_height_ratio = _estimate_body_height(lm, exercise)

    if body_height_ratio < min_body_height * 0.45:
        return CameraStatus(
            status="too_far",
            message="Move the camera closer — you're too far away",
            color="yellow",
            ready=False,
        )

    if body_height_ratio > 0.97:
        return CameraStatus(
            status="too_close",
            message="Move the camera further away — too close",
            color="yellow",
            ready=False,
        )

    # ── 4. Check frontal orientation (shoulders should be roughly horizontal) 
    left_sh  = lm[LM_LEFT_SHOULDER]
    right_sh = lm[LM_RIGHT_SHOULDER]
    shoulder_tilt = abs(float(left_sh[1] - right_sh[1]))   # y difference
    shoulder_width = abs(float(left_sh[0] - right_sh[0]))  # x difference

    if shoulder_width < 0.01:
        return CameraStatus(
            status="rotate",
            message="Turn to face the camera directly",
            color="red",
            ready=False,
        )

    # ── All checks passed ──────────────────────────────────────────────────
    return CameraStatus(
        status="good",
        message="Camera position looks great — ready to go!",
        color="green",
        ready=True,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _estimate_body_height(lm: np.ndarray, exercise: str) -> float:
    """
    Estimate how much of the vertical frame the body occupies.
    Uses the highest and lowest visible required landmarks.
    """
    cfg = CAMERA_CONFIG.get(exercise, DEFAULT_CONFIG)
    req = cfg["required"]
    vis_mask = lm[req, 3] > 0.3
    if vis_mask.sum() < 2:
        return 0.0

    visible_y = lm[req][vis_mask][:, 1]
    return float(visible_y.max() - visible_y.min())


def _identify_missing_region(lm: np.ndarray, required: List[int], exercise: str) -> str:
    """Figure out a helpful message about what's out of frame / invisible."""
    # Check if feet/lower body missing
    ankle_vis = lm[[LM_LEFT_ANKLE, LM_RIGHT_ANKLE], 3].mean()
    knee_vis  = lm[[LM_LEFT_KNEE, LM_RIGHT_KNEE], 3].mean()
    wrist_vis = lm[[LM_LEFT_WRIST, LM_RIGHT_WRIST], 3].mean()
    shoulder_vis = lm[[LM_LEFT_SHOULDER, LM_RIGHT_SHOULDER], 3].mean()

    needs_legs = any(i in required for i in [LM_LEFT_ANKLE, LM_RIGHT_ANKLE])

    if needs_legs and ankle_vis < 0.3:
        return "Step back so your feet are visible in frame"
    if shoulder_vis < 0.3:
        return "Can't detect your body — ensure full body is in frame"
    if wrist_vis < 0.3:
        return "Arms not fully visible — move camera to show full arm range"
    return "Body partially blocked — ensure nothing is obstructing the camera"


def _out_of_frame_message(lm: np.ndarray, required: List[int]) -> str:
    """Determine which direction to guide the user."""
    coords = lm[required, :2]
    vis    = lm[required, 3]
    vis_mask = vis > 0.3

    if vis_mask.sum() == 0:
        return "Body not detected — ensure full body is visible"

    visible_coords = coords[vis_mask]
    min_x, max_x = visible_coords[:, 0].min(), visible_coords[:, 0].max()
    min_y, max_y = visible_coords[:, 1].min(), visible_coords[:, 1].max()

    if min_y < 0.05:
        return "Move camera down — head is out of frame"
    if max_y > 0.95:
        return "Move camera up or step back — feet are cut off"
    if min_x < 0.05:
        return "Move camera right — body is cut off on the left"
    if max_x > 0.95:
        return "Move camera left — body is cut off on the right"
    return "Adjust camera position to show your full body"
