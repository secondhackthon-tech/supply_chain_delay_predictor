#!/usr/bin/env bash
set -e

# Pull latest DVC-tracked artifacts if a remote is configured.
if [ -n "$DVC_REMOTE_URL" ]; then
  echo "[startup] pulling artifacts from DVC remote..."
  dvc pull artifacts/models/model.pkl artifacts/models/preprocessor.pkl artifacts/metrics.json || true
fi

# Cold-start safety net: if no model exists, train one from synthetic data so /predict works.
if [ ! -f artifacts/models/model.pkl ]; then
  echo "[startup] no model on disk — running quick training from synthetic data..."
  python -m src.ingest
  python -m src.preprocess
  python -m src.features
  python -m src.train
  python -m src.evaluate || true
fi

exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
