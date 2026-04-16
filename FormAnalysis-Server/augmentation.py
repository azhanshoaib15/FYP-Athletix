"""
augmentation.py
---------------
Generates synthetic training samples from existing .npy pose sequences.
All augmentations preserve the biomechanical validity of the pose data.
Running augment_dataset() gives ~5x more samples with no new recordings needed.
"""

import numpy as np
from typing import List, Tuple

# MediaPipe left↔right landmark swap pairs (for horizontal flip)
_FLIP_PAIRS = [
    (1, 4), (2, 5), (3, 6), (7, 8),
    (9, 10), (11, 12), (13, 14), (15, 16),
    (17, 18), (19, 20), (21, 22), (23, 24),
    (25, 26), (27, 28), (29, 30), (31, 32),
]


# ── Individual augmentations ─────────────────────────────────────────────────

def time_warp(seq: np.ndarray, factor: float = None) -> np.ndarray:
    """
    Stretch or compress the sequence in time.
    factor < 1 = faster movement, factor > 1 = slower movement.
    """
    if factor is None:
        factor = np.random.uniform(0.75, 1.35)
    n_orig = len(seq)
    n_new = max(8, int(n_orig * factor))
    idx = np.linspace(0, n_orig - 1, n_new).astype(int)
    return seq[idx]


def add_joint_noise(seq: np.ndarray, sigma: float = 0.008) -> np.ndarray:
    """
    Add small Gaussian noise to x, y, z coordinates only (not visibility).
    sigma ~ 0.008 is subtle enough to not break joint angles.
    """
    aug = seq.copy()
    # Only perturb x, y, z (indices 0,1,2 of each 4-tuple)
    coord_mask = np.array([True, True, True, False] * 33)
    aug[:, coord_mask] += np.random.normal(0, sigma, (len(aug), 99)).astype(np.float32)
    return aug


def horizontal_flip(seq: np.ndarray) -> np.ndarray:
    """
    Mirror the pose left-to-right.
    Swaps left/right landmark pairs and negates x-coordinates.
    Works well for symmetric exercises (bicep curl, shoulder press, squats).
    """
    aug = seq.copy().reshape(len(seq), 33, 4)
    # Swap landmark pairs
    for l, r in _FLIP_PAIRS:
        aug[:, [l, r], :] = aug[:, [r, l], :]
    # Negate x (mirror horizontally)
    aug[:, :, 0] = 1.0 - aug[:, :, 0]
    return aug.reshape(len(seq), 132)


def random_frame_dropout(seq: np.ndarray, drop_rate: float = 0.05) -> np.ndarray:
    """
    Randomly remove a small fraction of frames, then re-interpolate.
    Simulates occasional detection failures.
    """
    n = len(seq)
    keep = np.random.rand(n) > drop_rate
    if keep.sum() < 5:
        return seq
    kept = seq[keep]
    # Interpolate back to original length
    idx = np.linspace(0, len(kept) - 1, n).astype(int)
    return kept[idx]


def speed_jitter(seq: np.ndarray) -> np.ndarray:
    """
    Non-uniform time warp: randomly slow down or speed up different segments.
    More realistic than uniform time warp.
    """
    n = len(seq)
    n_segments = np.random.randint(2, 5)
    breakpoints = sorted(np.random.choice(range(1, n - 1), n_segments - 1, replace=False))
    breakpoints = [0] + list(breakpoints) + [n]

    pieces = []
    for i in range(len(breakpoints) - 1):
        seg = seq[breakpoints[i]:breakpoints[i + 1]]
        factor = np.random.uniform(0.7, 1.4)
        pieces.append(time_warp(seg, factor))

    return np.concatenate(pieces, axis=0)


# ── Augmentation strategies (each returns ONE augmented sequence) ─────────────

AUGMENTATION_FNS = [
    lambda s: time_warp(s),
    lambda s: add_joint_noise(s),
    lambda s: horizontal_flip(s),
    lambda s: random_frame_dropout(s),
    lambda s: speed_jitter(s),
    lambda s: add_joint_noise(time_warp(s)),          # combo: warp + noise
    lambda s: horizontal_flip(add_joint_noise(s)),    # combo: flip + noise
]


def augment_sequence(seq: np.ndarray, n_augments: int = 6) -> List[np.ndarray]:
    """
    Returns n_augments augmented versions of seq.
    Randomly samples from AUGMENTATION_FNS without replacement up to len(fns).
    """
    chosen = np.random.choice(len(AUGMENTATION_FNS), size=min(n_augments, len(AUGMENTATION_FNS)), replace=False)
    return [AUGMENTATION_FNS[i](seq) for i in chosen]


# ── Dataset-level augmentation ───────────────────────────────────────────────

def augment_dataset(
    X: List[np.ndarray],
    y: np.ndarray,
    n_augments_per_sample: int = 6,
    seed: int = 42
) -> Tuple[List[np.ndarray], np.ndarray]:
    """
    Takes the original dataset and returns an expanded dataset with augmentations.

    Parameters
    ----------
    X : list of (frames, 132) arrays
    y : (N,) label array
    n_augments_per_sample : how many synthetic copies per original sample

    Returns
    -------
    X_aug, y_aug  (original + synthetic combined)
    """
    np.random.seed(seed)
    X_new, y_new = list(X), list(y)

    for seq, label in zip(X, y):
        augmented = augment_sequence(seq, n_augments=n_augments_per_sample)
        X_new.extend(augmented)
        y_new.extend([label] * len(augmented))

    return X_new, np.array(y_new)


def print_augmentation_summary(y_orig: np.ndarray, y_aug: np.ndarray):
    orig_right = (y_orig == 1).sum()
    orig_wrong = (y_orig == 0).sum()
    aug_right  = (y_aug  == 1).sum()
    aug_wrong  = (y_aug  == 0).sum()
    print(f"Before augmentation: {len(y_orig)} samples  (Right={orig_right}, Wrong={orig_wrong})")
    print(f"After  augmentation: {len(y_aug)}  samples  (Right={aug_right},  Wrong={aug_wrong})")
    print(f"Expansion factor: {len(y_aug)/len(y_orig):.1f}x")
