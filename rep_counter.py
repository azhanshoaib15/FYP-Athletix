"""
rep_counter.py
--------------
Counts exercise repetitions from a sequence of joint angles.

Algorithm: smoothed angle signal → valley/peak detector → state machine
  WAITING → DOWN (angle crosses low threshold)
           → UP   (angle crosses high threshold after DOWN)
           → DOWN completes one rep

Each exercise defines:
  - tracked_angle : which angle from feature_engineering.ANGLE_NAMES to watch
  - low_thresh    : angle at the "down / contracted" position
  - high_thresh   : angle at the "up / extended" position
  - mode          : "flex"  → low=contracted  (bicep curl, squat, push-up)
                    "raise" → high=contracted (lateral raise, shoulder press from bottom)
"""

import numpy as np
from collections import deque
from feature_engineering import ANGLE_NAMES, angles_for_frame

# ── Per-exercise rep configuration ───────────────────────────────────────────
#
# low_thresh  = angle below which we call it "bottom of rep"
# high_thresh = angle above which we call it "top of rep"
# mode        : "flex"  → rep = bottom then back to top (curls, squats, push-ups)
#               "raise" → rep = top   then back to bottom (raises, presses from low)
# primary_side: "right" | "left" | "both" — which side's angle to track
#               "both" = average left+right (used for symmetric exercises)
#
REP_CONFIG = {
    # ── Arms ──────────────────────────────────────────────────────────────────
    "Bicep curl": {
        "tracked_angle": "right_elbow",
        "low_thresh":  70,   # arm curled
        "high_thresh": 150,  # arm extended
        "mode": "flex",
    },
    "Tricep pushdown": {
        "tracked_angle": "right_elbow",
        "low_thresh":  40,   # fully extended down
        "high_thresh": 120,  # arm bent
        "mode": "flex",      # starts bent, goes straight, counts on return
    },
    "Tricep Dips": {
        "tracked_angle": "right_elbow",
        "low_thresh":  70,
        "high_thresh": 150,
        "mode": "flex",
    },

    # ── Shoulders ─────────────────────────────────────────────────────────────
    "Shoulder press": {
        "tracked_angle": "right_elbow",
        "low_thresh":  80,   # elbows bent at shoulder height
        "high_thresh": 155,  # arms fully extended overhead
        "mode": "raise",     # starts low, presses up — count on return to bottom
    },
    "Lateral Raises": {
        "tracked_angle": "right_shoulder_arm",
        "low_thresh":  20,   # arms at side
        "high_thresh": 75,   # arms raised to shoulder height
        "mode": "raise",
    },

    # ── Chest ─────────────────────────────────────────────────────────────────
    "Bench Press": {
        "tracked_angle": "right_elbow",
        "low_thresh":  70,   # bar at chest
        "high_thresh": 155,  # arms extended
        "mode": "raise",
    },
    "Incline beanch Press": {
        "tracked_angle": "right_elbow",
        "low_thresh":  70,
        "high_thresh": 150,
        "mode": "raise",
    },
    "PushUp": {
        "tracked_angle": "right_elbow",
        "low_thresh":  70,   # chest near floor
        "high_thresh": 155,  # arms extended
        "mode": "flex",
    },
    "Chest Fly": {
        "tracked_angle": "right_shoulder_arm",
        "low_thresh":  30,   # arms wide open
        "high_thresh": 90,   # arms together
        "mode": "raise",
    },

    # ── Back ──────────────────────────────────────────────────────────────────
    "BackRows": {
        "tracked_angle": "right_elbow",
        "low_thresh":  90,   # arms extended forward
        "high_thresh": 150,  # elbows pulled back
        "mode": "raise",
    },
    "Lat Pulldown": {
        "tracked_angle": "right_elbow",
        "low_thresh":  60,   # bar pulled to chest
        "high_thresh": 155,  # arms extended overhead
        "mode": "flex",
    },
    "Pull Ups": {
        "tracked_angle": "right_elbow",
        "low_thresh":  60,   # chin over bar
        "high_thresh": 155,  # arms fully extended
        "mode": "flex",
    },

    # ── Legs ──────────────────────────────────────────────────────────────────
    "Squats": {
        "tracked_angle": "right_knee",
        "low_thresh":  80,   # parallel squat
        "high_thresh": 155,  # standing
        "mode": "flex",
    },
    "Lunges": {
        "tracked_angle": "right_knee",
        "low_thresh":  80,
        "high_thresh": 155,
        "mode": "flex",
    },
    "Leg Press": {
        "tracked_angle": "right_knee",
        "low_thresh":  70,   # knees bent
        "high_thresh": 155,  # legs extended
        "mode": "raise",
    },
    "Leg Extension": {
        "tracked_angle": "right_knee",
        "low_thresh":  60,   # knee bent
        "high_thresh": 155,  # leg extended
        "mode": "raise",
    },

    # ── Core ──────────────────────────────────────────────────────────────────
    "Leg Raises": {
        "tracked_angle": "right_hip",
        "low_thresh":  20,   # legs up (hip angle small)
        "high_thresh": 80,   # legs down
        "mode": "flex",
    },
    "Plank": {
        # Plank is isometric — no reps, count seconds held instead
        "tracked_angle": "right_trunk",
        "low_thresh":  160,  # good straight plank
        "high_thresh": 180,
        "mode": "hold",      # special: counts time, not reps
    },
}


# ── Smoothing ─────────────────────────────────────────────────────────────────

def smooth_signal(signal: np.ndarray, window: int = 5) -> np.ndarray:
    """Moving average smoothing."""
    if len(signal) < window:
        return signal
    kernel = np.ones(window) / window
    return np.convolve(signal, kernel, mode="same")


# ── State machine rep counter ─────────────────────────────────────────────────

class RepCounter:
    """
    Stateful rep counter for a single live session.
    Call update(frame_132) on each new frame.
    """

    def __init__(self, exercise: str):
        self.exercise = exercise
        self.config   = REP_CONFIG.get(exercise)
        self.reps     = 0
        self._state   = "waiting"   # waiting → down → up (→ down = rep complete)
        self._history = deque(maxlen=200)
        self._hold_frames = 0       # for plank

        if self.config is None:
            raise ValueError(f"No rep config for '{exercise}'")

        self._angle_idx = ANGLE_NAMES.index(self.config["tracked_angle"])

    def update(self, frame_132: np.ndarray) -> int:
        """
        Feed one (132,) frame. Returns current rep count.
        """
        angles = angles_for_frame(frame_132)
        angle  = float(angles[self._angle_idx])
        self._history.append(angle)

        cfg = self.config

        if cfg["mode"] == "hold":
            # Plank: count seconds-worth of frames at good form
            if angle >= cfg["low_thresh"]:
                self._hold_frames += 1
            return self._hold_frames // 30   # approximate seconds at 30fps

        low  = cfg["low_thresh"]
        high = cfg["high_thresh"]

        if cfg["mode"] == "flex":
            # Rep: starts high → goes low → returns high
            if self._state == "waiting" and angle >= high:
                self._state = "top"
            elif self._state == "top" and angle <= low:
                self._state = "bottom"
            elif self._state == "bottom" and angle >= high:
                self._state = "top"
                self.reps += 1

        elif cfg["mode"] == "raise":
            # Rep: starts low → goes high → returns low
            if self._state == "waiting" and angle <= low:
                self._state = "bottom"
            elif self._state == "bottom" and angle >= high:
                self._state = "top"
            elif self._state == "top" and angle <= low:
                self._state = "bottom"
                self.reps += 1

        return self.reps

    def reset(self):
        self.reps = 0
        self._state = "waiting"
        self._history.clear()
        self._hold_frames = 0


# ── Batch rep counter (for post-hoc counting on a full sequence) ──────────────

def count_reps_from_sequence(seq: np.ndarray, exercise: str) -> dict:
    """
    Count reps from a full (frames, 132) sequence.
    Returns {reps, angle_signal, rep_frame_indices}
    """
    if exercise not in REP_CONFIG:
        return {"reps": 0, "angle_signal": [], "rep_frame_indices": []}

    config    = REP_CONFIG[exercise]
    angle_idx = ANGLE_NAMES.index(config["tracked_angle"])
    mode      = config["mode"]
    low       = config["low_thresh"]
    high      = config["high_thresh"]

    # Extract angle signal
    raw_signal = np.array([
        float(angles_for_frame(frame)[angle_idx]) for frame in seq
    ])
    signal = smooth_signal(raw_signal, window=7)

    if mode == "hold":
        hold_frames = int((signal >= low).sum())
        return {"reps": hold_frames // 30, "angle_signal": signal.tolist(),
                "rep_frame_indices": []}

    # Valley/peak detection
    reps = 0
    rep_frames = []
    state = "waiting"

    for i, angle in enumerate(signal):
        if mode == "flex":
            if state == "waiting" and angle >= high:
                state = "top"
            elif state == "top" and angle <= low:
                state = "bottom"
            elif state == "bottom" and angle >= high:
                state = "top"
                reps += 1
                rep_frames.append(i)
        elif mode == "raise":
            if state == "waiting" and angle <= low:
                state = "bottom"
            elif state == "bottom" and angle >= high:
                state = "top"
            elif state == "top" and angle <= low:
                state = "bottom"
                reps += 1
                rep_frames.append(i)

    return {
        "reps": reps,
        "angle_signal": signal.tolist(),
        "rep_frame_indices": rep_frames,
        "tracked_angle": config["tracked_angle"],
    }
