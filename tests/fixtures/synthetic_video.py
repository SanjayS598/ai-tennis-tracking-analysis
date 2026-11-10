"""Test fixture to generate minimal valid synthetic tennis video clips using OpenCV."""

from pathlib import Path
import cv2
import numpy as np


def create_synthetic_tennis_video(
    output_path: Path,
    num_frames: int = 30,
    fps: float = 30.0,
    width: int = 640,
    height: int = 360,
) -> Path:
    """Generate a simple synthetic video with a simulated green court and moving yellow ball.
    
    Returns:
        Path to the generated video file.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    if not writer.isOpened():
        raise RuntimeError(f"Could not open VideoWriter for path: {output_path}")

    # Simulated ball trajectory (parabolic bounce)
    ball_x_start = 100
    ball_y_start = 50
    ground_y = int(height * 0.75)

    for i in range(num_frames):
        # Green court background (BGR: 50, 120, 50)
        frame = np.full((height, width, 3), (50, 120, 50), dtype=np.uint8)

        # Draw white court boundary lines
        cv2.rectangle(frame, (80, int(height * 0.3)), (width - 80, ground_y), (255, 255, 255), 2)
        # Net line across center
        cv2.line(frame, (80, int(height * 0.5)), (width - 80, int(height * 0.5)), (200, 200, 200), 2)

        # Ball motion
        ball_x = int(ball_x_start + i * (width - 200) / max(num_frames - 1, 1))
        # Parabolic bounce path: touches ground around frame num_frames // 2
        t = (i - num_frames // 2) / (num_frames // 2)
        ball_y = int(ground_y - (1 - t * t) * (ground_y - ball_y_start))

        # Yellow tennis ball (BGR: 30, 220, 220)
        cv2.circle(frame, (ball_x, ball_y), 6, (30, 220, 220), -1)

        writer.write(frame)

    writer.release()
    return output_path
