FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl libgomp1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

RUN chmod +x start.sh && \
    mkdir -p data/raw data/processed data/features artifacts/models

# Ensure a model exists so the container is demo-ready out of the box.
# If MLflow / DVC creds are provided at runtime, start.sh will pull the real one.
RUN python -m src.ingest && \
    python -m src.preprocess && \
    python -m src.features && \
    python -m src.train && \
    python -m src.evaluate || echo "warmup training skipped"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/health || exit 1

CMD ["./start.sh"]
