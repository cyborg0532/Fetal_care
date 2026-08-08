# Dockerfile for Render Web Service Deployment — MaternalCare Unified API
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=10000

WORKDIR /app

# Install system dependencies (needed for compiling psycopg2 and C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python production dependencies
COPY requirements-prod.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-prod.txt

# Copy application source code & data assets into container
COPY core_backend /app/core_backend
COPY ai_service /app/ai_service
COPY Data /app/Data
COPY PcosData /app/PcosData
COPY main_prod.py /app/main_prod.py

# Expose Render default port
EXPOSE 10000

# Start unified Uvicorn server on Render's assigned PORT
CMD ["sh", "-c", "uvicorn main_prod:app --host 0.0.0.0 --port ${PORT:-10000}"]
