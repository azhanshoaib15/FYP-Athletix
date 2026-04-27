"""
feature_engineering.py
-----------------------
Converts raw MediaPipe pose sequences (frames × 132) into a compact,
fixed-length feature vector based on joint angles + temporal statistics.

Why angles instead of raw coordinates?
  - Invariant to where the person stands in frame (position/distance)
  - 10 angles × 7 stats = 70 features vs. 400×132 = 52,800 padded features
  - XGBoost can actually learn from 70 meaningful features with 20 samples
"""

import numpy as np

# ── MediaPipe landmark indices ──────────────────────────────────────────────
# Each landmark stored as (x, y, z, visibility) → stride of 4

# Joint angle definitions: (point_A, VERTEX, point_C) → angle at VERTEX
ANGLE_TRIPLETS = {
    # Arms
    "left_elbow":         (11, 13, 15),   # shoulder → elbow → wrist
    "right_elbow":        (12, 14, 16),
    "left_shoulder_arm":  (23, 11, 13),   # hip → shoulder → elbow
    "right_shoulder_arm": (24, 12, 14),

    # Legs
    "left_knee":          (23, 25, 27),   # hip → knee → ankle
    "right_knee":         (24, 26, 28),
    "left_hip":           (11, 23, 25),   # shoulder → hip → knee
    "right_hip":          (12, 24, 26),

    # Trunk
    "left_trunk":         ( 7, 11, 23),   # ear → shoulder → hip (lateral lean)
    "right_trunk":        ( 8, 12, 24),

    # Wrist elevation (shoulder → wrist relative to shoulder → hip)
    "left_shoulder_elev": (15, 11, 23),   # wrist → shoulder → hip
    "right_shoulder_elev":(16, 12, 24),
}

ANGLE_NAMES = list(ANGLE_TRIPLETS.keys())
N_ANGLES = len(ANGLE_NAMES)

# Mirror map for horizontal flip augmentation
# Maps right↔left landmark indices
_FLIP_PAIRS = [
    (1, 4), (2, 5), (3, 6), (7, 8),
    (9, 10), (11, 12), (13, 14), (15, 16),
    (17, 18), (19, 20), (21, 22), (23, 24),
    (25, 26), (27, 28), (29, 30), (31, 32),
]


# ── Core geometry ────────────────────────────────────────────────────────────

def _angle_at_vertex(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle in degrees at joint b, given 3-D points a, b, c."""
    ba = a - b
    bc = c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8
    cosine = np.dot(ba, bc) / denom
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


def angles_for_frame(frame: np.ndarray) -> np.ndarray:
    """
    frame : (132,)  raw MediaPipe output
    returns: (N_ANGLES,)  angles in degrees
    """
    xyz = frame.reshape(33, 4)[:, :3]          # (33, 3)
    return np.array([
        _angle_at_vertex(xyz[a], xyz[b], xyz[c])
        for a, b, c in ANGLE_TRIPLETS.values()
    ], dtype=np.float32)


def angles_for_sequence(seq: np.ndarray) -> np.ndarray:
    """
    seq : (frames, 132)
    returns: (frames, N_ANGLES)
    """
    return np.stack([angles_for_frame(f) for f in seq], axis=0)


# ── Statistical aggregation → fixed-length vector ───────────────────────────

_PERCENTILES = [10, 25, 50, 75, 90]

def aggregate_angles(angle_seq: np.ndarray) -> np.ndarray:
    """
    angle_seq : (frames, N_ANGLES)
    returns  : 1-D feature vector

    Per angle: mean, std, min, max, range, p10, p25, p50, p75, p90
    Plus cross-joint symmetry features (left-right differences)
    Total: N_ANGLES × 10 + 4 symmetry = 124 features
    """
    feats = []
    for col in range(angle_seq.shape[1]):
        a = angle_seq[:, col]
        feats += [
            a.mean(), a.std(),
            a.min(), a.max(),
            a.max() - a.min(),              # range
            *np.percentile(a, _PERCENTILES),
        ]

    # Symmetry: mean(left) - mean(right) for 4 limb pairs
    # indices: left_elbow=0, right_elbow=1, left_shoulder_arm=2, right_shoulder_arm=3
    #          left_knee=4,  right_knee=5,  left_hip=6,          right_hip=7
    for l_idx, r_idx in [(0, 1), (2, 3), (4, 5), (6, 7)]:
        feats.append(
            angle_seq[:, l_idx].mean() - angle_seq[:, r_idx].mean()
        )

    return np.array(feats, dtype=np.float32)


def sequence_to_feature_vector(seq: np.ndarray) -> np.ndarray:
    """
    Full pipeline: raw sequence (frames, 132) → fixed-length feature vector.
    This is the function to call at training AND inference time.
    """
    if seq.ndim != 2 or seq.shape[1] != 132:
        raise ValueError(f"Expected (frames, 132), got {seq.shape}")
    if len(seq) < 5:
        # Too short — return zeros (will be filtered in training)
        n_feats = N_ANGLES * 10 + 4
        return np.zeros(n_feats, dtype=np.float32)

    angle_seq = angles_for_sequence(seq)
    return aggregate_angles(angle_seq)


def feature_dim() -> int:
    """Returns the output dimension of sequence_to_feature_vector."""
    return N_ANGLES * 10 + 4   # 124


# ── Visibility filtering ─────────────────────────────────────────────────────

def filter_low_confidence_frames(seq: np.ndarray, min_visibility: float = 0.2) -> np.ndarray:
    """
    Improved filtering:
    - Uses only important joints
    - Keeps enough frames for analysis
    """

    IMPORTANT_LANDMARKS = [11, 12, 23, 24, 25, 26, 27, 28]  # shoulders, hips, knees, ankles

    lm = seq.reshape(len(seq), 33, 4)

    vis = lm[:, IMPORTANT_LANDMARKS, 3].mean(axis=1)

    mask = vis >= min_visibility
    filtered = seq[mask]

    # Ensure enough frames survive
    if len(filtered) < 15:
        return seq

    return filtered
