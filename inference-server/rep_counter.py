"""
Rep counter using joint angles from YOLOv8-pose keypoints.

COCO keypoint indices:
  0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear,
  5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow,
  9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip,
  13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle
"""

import math
from dataclasses import dataclass, field


def _angle(a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]) -> float:
    """Angle at point b formed by segments b->a and b->c, in degrees."""
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.hypot(*ba)
    mag_bc = math.hypot(*bc)
    if mag_ba < 1e-6 or mag_bc < 1e-6:
        return 0.0
    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def _kp(keypoints: list[list[float]], idx: int) -> tuple[float, float, float]:
    """Return (x, y, conf) for a keypoint index."""
    if idx < len(keypoints):
        return (keypoints[idx][0], keypoints[idx][1], keypoints[idx][2])
    return (0.0, 0.0, 0.0)


MIN_CONF = 0.4  # minimum keypoint confidence to use


@dataclass
class RepCounter:
    """Stateful rep counter that detects exercise type and counts reps from pose keypoints."""

    count: int = 0
    phase: str = "idle"  # "up", "down", or "idle"
    exercise: str = "unknown"
    _prev_angle: float = 0.0
    _phase_history: list[str] = field(default_factory=list)
    _angle_buffer: list[float] = field(default_factory=list)
    _frame_count: int = 0

    def update(self, keypoints: list[list[float]]) -> dict:
        """Process a frame's keypoints and return current state."""
        self._frame_count += 1

        # Extract key joint positions
        l_shoulder = _kp(keypoints, 5)
        r_shoulder = _kp(keypoints, 6)
        l_elbow = _kp(keypoints, 7)
        r_elbow = _kp(keypoints, 8)
        l_wrist = _kp(keypoints, 9)
        r_wrist = _kp(keypoints, 10)
        l_hip = _kp(keypoints, 11)
        r_hip = _kp(keypoints, 12)
        l_knee = _kp(keypoints, 13)
        r_knee = _kp(keypoints, 14)
        l_ankle = _kp(keypoints, 15)
        r_ankle = _kp(keypoints, 16)

        # Compute angles for exercise detection
        angles = {}

        # Elbow angles (for curls)
        if l_elbow[2] > MIN_CONF and l_shoulder[2] > MIN_CONF and l_wrist[2] > MIN_CONF:
            angles["l_elbow"] = _angle(
                (l_shoulder[0], l_shoulder[1]),
                (l_elbow[0], l_elbow[1]),
                (l_wrist[0], l_wrist[1]),
            )
        if r_elbow[2] > MIN_CONF and r_shoulder[2] > MIN_CONF and r_wrist[2] > MIN_CONF:
            angles["r_elbow"] = _angle(
                (r_shoulder[0], r_shoulder[1]),
                (r_elbow[0], r_elbow[1]),
                (r_wrist[0], r_wrist[1]),
            )

        # Knee angles (for squats)
        if l_knee[2] > MIN_CONF and l_hip[2] > MIN_CONF and l_ankle[2] > MIN_CONF:
            angles["l_knee"] = _angle(
                (l_hip[0], l_hip[1]),
                (l_knee[0], l_knee[1]),
                (l_ankle[0], l_ankle[1]),
            )
        if r_knee[2] > MIN_CONF and r_hip[2] > MIN_CONF and r_ankle[2] > MIN_CONF:
            angles["r_knee"] = _angle(
                (r_hip[0], r_hip[1]),
                (r_knee[0], r_knee[1]),
                (r_ankle[0], r_ankle[1]),
            )

        # Shoulder angles (for overhead press)
        if l_shoulder[2] > MIN_CONF and l_hip[2] > MIN_CONF and l_elbow[2] > MIN_CONF:
            angles["l_shoulder"] = _angle(
                (l_hip[0], l_hip[1]),
                (l_shoulder[0], l_shoulder[1]),
                (l_elbow[0], l_elbow[1]),
            )
        if r_shoulder[2] > MIN_CONF and r_hip[2] > MIN_CONF and r_elbow[2] > MIN_CONF:
            angles["r_shoulder"] = _angle(
                (r_hip[0], r_hip[1]),
                (r_shoulder[0], r_shoulder[1]),
                (r_elbow[0], r_elbow[1]),
            )

        # Detect exercise and primary angle
        primary_angle = 0.0
        exercise = self.exercise

        # Check for squat (knee angle changes significantly)
        avg_knee = self._avg_angle(angles, "l_knee", "r_knee")
        avg_elbow = self._avg_angle(angles, "l_elbow", "r_elbow")
        avg_shoulder = self._avg_angle(angles, "l_shoulder", "r_shoulder")

        if avg_knee > 0 and avg_knee < 140:
            exercise = "squat"
            primary_angle = avg_knee
        elif avg_elbow > 0 and avg_elbow < 140:
            exercise = "bicep curl"
            primary_angle = avg_elbow
        elif avg_shoulder > 0 and avg_shoulder > 90:
            exercise = "overhead press"
            primary_angle = avg_shoulder
        elif avg_elbow > 0:
            exercise = "bicep curl"
            primary_angle = avg_elbow
        elif avg_knee > 0:
            exercise = "squat"
            primary_angle = avg_knee

        self.exercise = exercise

        # Smooth angle with buffer
        self._angle_buffer.append(primary_angle)
        if len(self._angle_buffer) > 5:
            self._angle_buffer.pop(0)
        smoothed = sum(self._angle_buffer) / len(self._angle_buffer) if self._angle_buffer else 0

        # Phase detection and rep counting
        if primary_angle > 0:
            self._detect_phase(smoothed)

        return {
            "exercise": self.exercise,
            "repCount": self.count,
            "phase": self.phase,
        }

    def _avg_angle(self, angles: dict, left: str, right: str) -> float:
        """Average of left and right angles, or whichever is available."""
        vals = [angles[k] for k in (left, right) if k in angles]
        return sum(vals) / len(vals) if vals else 0.0

    def _detect_phase(self, angle: float) -> None:
        """Detect up/down phase transitions and count reps."""
        # Thresholds depend on exercise
        if self.exercise == "squat":
            down_thresh = 100  # knees bent
            up_thresh = 155    # standing
        elif self.exercise == "bicep curl":
            down_thresh = 55   # curl up (small elbow angle = up position)
            up_thresh = 140    # arm extended
        elif self.exercise == "overhead press":
            down_thresh = 90   # arms at shoulder level
            up_thresh = 160    # arms overhead
        else:
            return

        if self.exercise == "bicep curl":
            # For curls: small angle = "up" (contracted), large angle = "down" (extended)
            if angle < down_thresh and self.phase != "up":
                old_phase = self.phase
                self.phase = "up"
                if old_phase == "down":
                    self.count += 1
            elif angle > up_thresh and self.phase != "down":
                self.phase = "down"
        else:
            # For squat/OHP: small angle = "down", large angle = "up"
            if angle < down_thresh and self.phase != "down":
                self.phase = "down"
            elif angle > up_thresh and self.phase != "up":
                old_phase = self.phase
                self.phase = "up"
                if old_phase == "down":
                    self.count += 1

    def reset(self) -> None:
        """Reset counter state."""
        self.count = 0
        self.phase = "idle"
        self.exercise = "unknown"
        self._prev_angle = 0.0
        self._phase_history.clear()
        self._angle_buffer.clear()
        self._frame_count = 0
