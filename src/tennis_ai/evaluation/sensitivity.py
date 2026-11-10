"""Camera movement and calibration sensitivity analyzer."""

import argparse
import json
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from tennis_ai.court.geometry import (
    COURT_LENGTH_M,
    SINGLES_WIDTH_M,
    CourtCalibrator,
    CourtKeypoints,
)


class CalibrationSensitivityAnalyzer:
    """Analyzes the impact of camera vibration and wind jitter on metric court line calls."""

    def __init__(self, calibrator: CourtCalibrator):
        if not calibrator.is_calibrated:
            raise ValueError("Calibrator must be calibrated before sensitivity analysis")
        self.calibrator = calibrator

    def evaluate_jitter(
        self, pixel_jitter_std: float = 3.0, num_samples: int = 50
    ) -> Dict[str, Any]:
        """Add Gaussian pixel jitter to image calibration control points and measure court drift (cm)."""
        orig_img_pts = self.calibrator.image_points
        orig_court_pts = self.calibrator.court_points

        # Sample test points on court to evaluate drift
        test_points = [
            (0.0, 0.0),                     # Near-left corner
            (SINGLES_WIDTH_M, 0.0),         # Near-right corner
            (4.115, 0.0),                   # Near baseline center
            (0.0, COURT_LENGTH_M),          # Far-left corner
            (SINGLES_WIDTH_M, COURT_LENGTH_M), # Far-right corner
            (4.115, 11.885),                # Net center
        ]

        drifts_cm: List[float] = []

        np.random.seed(42)
        for _ in range(num_samples):
            # Apply jitter to image coordinates
            jittered_pts = [
                (
                    float(pt[0] + np.random.normal(0, pixel_jitter_std)),
                    float(pt[1] + np.random.normal(0, pixel_jitter_std)),
                )
                for pt in orig_img_pts
            ]

            perturbed_calib = CourtCalibrator()
            try:
                perturbed_calib.fit(jittered_pts, orig_court_pts)
            except Exception:
                continue

            # Measure drift on test points
            for cx, cy in test_points:
                u, v = self.calibrator.court_to_image(cx, cy)
                pred_x, pred_y = perturbed_calib.image_to_court(u, v)
                drift_m = np.hypot(cx - pred_x, cy - pred_y)
                drifts_cm.append(float(drift_m * 100.0))

        drift_arr = np.array(drifts_cm)
        mean_drift = float(np.mean(drift_arr)) if len(drift_arr) > 0 else 0.0
        max_drift = float(np.max(drift_arr)) if len(drift_arr) > 0 else 0.0
        p95_drift = float(np.percentile(drift_arr, 95)) if len(drift_arr) > 0 else 0.0

        # Tennis ball radius is 3.35 cm; uncertainty margin is 2.5 cm
        is_safe = p95_drift <= 2.5

        return {
            "pixel_jitter_std_px": pixel_jitter_std,
            "samples_evaluated": num_samples,
            "mean_drift_cm": round(mean_drift, 2),
            "median_drift_cm": round(float(np.median(drift_arr)), 2),
            "p95_drift_cm": round(p95_drift, 2),
            "max_drift_cm": round(max_drift, 2),
            "line_call_safety_pass": is_safe,
            "recommendation": (
                "Camera mounting is robust against expected wind jitter."
                if is_safe
                else "Camera tripod needs stabilization or sandbagging to prevent false line calls."
            ),
        }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Court Calibration Jitter Sensitivity Analyzer")
    parser.add_argument("-c", "--calibration", required=True, type=str, help="Path to calibration JSON")
    parser.add_argument("-j", "--jitter", type=float, default=3.0, help="Pixel jitter std dev (default: 3.0 px)")
    parser.add_argument("-o", "--output", type=str, default=None, help="Output JSON path")

    args = parser.parse_args(argv)

    with open(args.calibration, "r", encoding="utf-8") as f:
        data = json.load(f)

    calib = CourtCalibrator()
    img_pts = [(p["x"], p["y"]) for p in data["image_points"]]
    court_pts = [(p["x"], p["y"]) for p in data["court_points"]]
    calib.fit(img_pts, court_pts)

    analyzer = CalibrationSensitivityAnalyzer(calib)
    res = analyzer.evaluate_jitter(pixel_jitter_std=args.jitter)

    if args.output:
        out_p = Path(args.output).resolve()
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            f.write(json.dumps(res, indent=2))

    print("\n================ Calibration Sensitivity Analysis ================")
    print(f"Injected Camera Jitter:    {res['pixel_jitter_std_px']} pixels std")
    print(f"Mean Real-World Drift:     {res['mean_drift_cm']} cm")
    print(f"95th Percentile Drift:     {res['p95_drift_cm']} cm")
    print(f"Maximum Boundary Drift:    {res['max_drift_cm']} cm")
    print(f"Line-Call Safety Pass:     {'YES (Reliable)' if res['line_call_safety_pass'] else 'NO (Requires Tripod Anchor)'}")
    print(f"Guidance:                  {res['recommendation']}")
    print("==================================================================\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
