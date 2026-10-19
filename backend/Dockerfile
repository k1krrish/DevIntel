# Production Dockerfile for DevIntel Backend
FROM python:3.11-slim

# Install system dependencies (git is required for cloning repos and git insights)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose Render standard port
EXPOSE 10000

# Start FastAPI application with dynamic PORT support (defaulting to 10000 for Render)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
