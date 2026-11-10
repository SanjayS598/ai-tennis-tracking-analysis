# =========================================================
# Stage 1: Build React + TypeScript Frontend
# =========================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy source and build production bundle
COPY frontend/ ./
RUN npm run build

# =========================================================
# Stage 2: Python 3.11 Runtime Backend
# =========================================================
FROM python:3.11-slim AS runtime

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src \
    PORT=8000 \
    WS_PORT=8765

# Install system dependencies (OpenCV, FFmpeg, curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install PyTorch (CPU-optimized for standard container deployments)
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch torchvision || pip install --no-cache-dir torch

# Copy project metadata & source files
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Install Python package with pose & dev dependencies
RUN pip install --no-cache-dir ".[dev,pose]"

# Copy pre-trained TrackNet model weights, court configs, and sample clips
COPY weights/ ./weights/
COPY configs/ ./configs/
COPY data/samples/ ./data/samples/

# Copy compiled frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure outputs directory exists
RUN mkdir -p /app/outputs

# Expose HTTP/REST/WebSocket (8000) and Standalone WebSocket Event Transport (8765)
EXPOSE 8000 8765

# Healthcheck monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start the unified Tennis AI full-stack server
CMD ["python", "-m", "tennis_ai.api.app"]
