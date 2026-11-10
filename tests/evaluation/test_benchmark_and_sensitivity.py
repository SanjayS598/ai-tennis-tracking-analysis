"""Unit tests for performance benchmark profiler and court sensitivity analyzer."""

from pathlib import Path
import pytest

from tennis_ai.court.geometry import CourtCalibrator, COURT_LENGTH_M, SINGLES_WIDTH_M
from tennis_ai.evaluation.benchmark import run_inference_benchmark
from tennis_ai.evaluation.sensitivity import CalibrationSensitivityAnalyzer


def test_inference_benchmark_cpu_or_mps():
    # Run benchmark for 5 iterations on synthetic frames
    results = run_inference_benchmark(
        weights_path=None,  # Synthetic fallback for quick deterministic testing
        num_iterations=5,
        input_resolution=(360, 640),
    )

    assert results["iterations"] == 5
    assert results["mean_latency_ms"] > 0.0
    assert results["throughput_fps"] > 0.0
    assert "device" in results
    assert "memory_rss_mb" in results


def test_calibration_sensitivity_analyzer():
    calibrator = CourtCalibrator()
    img_pts = [(400.0, 900.0), (1520.0, 900.0), (700.0, 300.0), (1220.0, 300.0)]
    court_pts = [(0.0, 0.0), (SINGLES_WIDTH_M, 0.0), (0.0, COURT_LENGTH_M), (SINGLES_WIDTH_M, COURT_LENGTH_M)]
    calibrator.fit(img_pts, court_pts)

    analyzer = CalibrationSensitivityAnalyzer(calibrator=calibrator)
    # Test 5-pixel camera jitter
    report = analyzer.evaluate_jitter(pixel_jitter_std=5.0, num_samples=20)

    assert "mean_drift_cm" in report
    assert "max_drift_cm" in report
    assert report["mean_drift_cm"] >= 0.0
    # Jitter under 5px should produce small drift
    assert report["mean_drift_cm"] < 50.0
