"""Apple Silicon M4 performance profiling and latency benchmarking tool."""

import argparse
import json
from pathlib import Path
import resource
import sys
import time
from typing import Any, Dict, Optional, Tuple, Union
import numpy as np
import torch

from tennis_ai.ball.detector import BallDetectorPipeline
from tennis_ai.ball.model import BallTrackerNet


def get_peak_memory_mb() -> float:
    """Return peak resident memory usage in megabytes (macOS returns bytes)."""
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    # On macOS, ru_maxrss is in bytes
    return float(usage / (1024.0 * 1024.0))


def run_inference_benchmark(
    weights_path: Optional[Union[str, Path]] = "weights/tracknet_tennis.pt",
    num_iterations: int = 30,
    warmup_iterations: int = 5,
    input_resolution: Tuple[int, int] = (360, 640),
) -> Dict[str, Any]:
    """Measure inference latency, throughput (FPS), and memory footprint."""
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        device_name = "Apple Silicon GPU (MPS / Metal)"
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        device_name = torch.cuda.get_device_name(0)
    else:
        device = torch.device("cpu")
        device_name = "CPU"

    h, w = input_resolution
    dummy_input = torch.randn(1, 9, h, w, dtype=torch.float32).to(device)

    # Load TrackNet if weights provided and exist
    use_model = False
    if weights_path is not None and Path(weights_path).exists():
        try:
            model = BallTrackerNet.from_pretrained(weights_path, device=device)
            use_model = True
        except Exception:
            model = BallTrackerNet(in_channels=9, out_channels=256).to(device)
            model.eval()
            use_model = True
    else:
        model = BallTrackerNet(in_channels=9, out_channels=256).to(device)
        model.eval()
        use_model = True

    # Warmup runs
    with torch.no_grad():
        for _ in range(warmup_iterations):
            _ = model(dummy_input)
            if device.type == "mps":
                torch.mps.synchronize()

    # Benchmark runs
    latencies: list[float] = []
    with torch.no_grad():
        for _ in range(num_iterations):
            t0 = time.perf_counter()
            _ = model(dummy_input)
            if device.type == "mps":
                torch.mps.synchronize()
            t1 = time.perf_counter()
            latencies.append((t1 - t0) * 1000.0)  # ms

    lat_arr = np.array(latencies)
    mean_lat = float(np.mean(lat_arr))
    median_lat = float(np.median(lat_arr))
    p95_lat = float(np.percentile(lat_arr, 95))
    min_lat = float(np.min(lat_arr))
    max_lat = float(np.max(lat_arr))
    fps = 1000.0 / mean_lat if mean_lat > 0 else 0.0

    peak_memory = get_peak_memory_mb()

    return {
        "device": device_name,
        "device_type": device.type,
        "iterations": num_iterations,
        "input_resolution": f"{w}x{h}",
        "mean_latency_ms": round(mean_lat, 2),
        "median_latency_ms": round(median_lat, 2),
        "p95_latency_ms": round(p95_lat, 2),
        "min_latency_ms": round(min_lat, 2),
        "max_latency_ms": round(max_lat, 2),
        "throughput_fps": round(fps, 1),
        "memory_rss_mb": round(peak_memory, 1),
    }


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Apple Silicon M4 Performance Benchmark")
    parser.add_argument("-w", "--weights", type=str, default="weights/tracknet_tennis.pt", help="Path to weights")
    parser.add_argument("-n", "--iterations", type=int, default=50, help="Number of benchmark iterations")
    parser.add_argument("-o", "--output", type=str, default="outputs/benchmark_m4.json", help="Output JSON path")

    args = parser.parse_args(argv)

    print(f"--> Running performance benchmark ({args.iterations} iterations)...")
    res = run_inference_benchmark(
        weights_path=args.weights,
        num_iterations=args.iterations,
    )

    if args.output:
        out_p = Path(args.output).resolve()
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            f.write(json.dumps(res, indent=2))

    print("\n================ Tennis AI M4 Benchmark Results ================")
    print(f"Hardware Compute Device:   {res['device']}")
    print(f"Input Tensor Shape:        {res['input_resolution']} (9-channels)")
    print(f"Mean Latency per Frame:    {res['mean_latency_ms']} ms")
    print(f"Median Latency:            {res['median_latency_ms']} ms")
    print(f"95th Percentile Latency:   {res['p95_latency_ms']} ms")
    print(f"Effective Throughput:      {res['throughput_fps']} FPS")
    print(f"Peak RAM Footprint:        {res['memory_rss_mb']} MB")
    print(f"Benchmark Report Saved:    {Path(args.output).resolve() if args.output else 'None'}")
    print("================================================================\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
