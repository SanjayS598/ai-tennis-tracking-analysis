"""System evaluation, M4 Apple Silicon performance benchmarking, and camera sensitivity analysis."""

from tennis_ai.evaluation.benchmark import run_inference_benchmark
from tennis_ai.evaluation.sensitivity import CalibrationSensitivityAnalyzer

__all__ = ["run_inference_benchmark", "CalibrationSensitivityAnalyzer"]
