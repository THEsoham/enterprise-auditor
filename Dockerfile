# ── Stage 1: Build React frontend ──────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2: Python backend + serve built frontend ────────────
FROM python:3.11-slim

# System dependencies for PDF processing, graphics & fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    graphviz \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements & install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and assets
COPY . .

# Replace old web/ directory with the built React frontend
RUN rm -rf /app/web/*
COPY --from=frontend-build /frontend/dist/ /app/web/

# Expose ports: 8000 (FastAPI Web UI), 8501 (Streamlit App)
EXPOSE 8000 8501

# Default command: launch FastAPI web server
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
