"""FastAPI service for the Autonomous Logistics Risk & Intervention Platform."""
from __future__ import annotations

import json
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from src.config import ARTIFACTS_DIR

from .explain import explain_one
from .model_loader import (
    estimated_delay_days,
    get_model,
    recommend_action,
    risk_band,
    to_feature_frame,
)
from .schemas import (
    BatchRequest,
    ExplainResponse,
    Prediction,
    Shipment,
    SimulateRequest,
    SummaryResponse,
)

app = FastAPI(
    title="Logistics Risk & Intervention API",
    version="1.0.0",
    description="Predict shipment delays before dispatch and recommend interventions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

PREDICTION_LOG = ARTIFACTS_DIR / "prediction_log.jsonl"


def _score(records: list[dict]) -> list[Prediction]:
    model, _, meta = get_model()
    if model is None:
        raise HTTPException(503, "model not loaded — run `dvc repro` first")
    X = to_feature_frame(records)
    proba = model.predict_proba(X)[:, 1].tolist()
    version = meta.get("model_version", "dev")
    out: list[Prediction] = []
    for r, p in zip(records, proba):
        out.append(Prediction(
            risk_score=round(float(p), 4),
            risk_band=risk_band(p),
            recommended_action=recommend_action(p, r),
            estimated_delay_days=estimated_delay_days(p, r),
            model_version=version,
        ))
    PREDICTION_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(PREDICTION_LOG, "a") as f:
        for r, p in zip(records, proba):
            f.write(json.dumps({"ts": time.time(), "input": r, "score": p, "v": version}) + "\n")
    return out


@app.post("/predict", response_model=Prediction)
def predict(shipment: Shipment):
    return _score([shipment.model_dump()])[0]


@app.post("/predict_batch", response_model=list[Prediction])
def predict_batch(req: BatchRequest):
    return _score([s.model_dump() for s in req.shipments])


@app.post("/simulate")
def simulate(req: SimulateRequest):
    base = req.base.model_dump()
    original = _score([base])[0]
    modified = {**base, **req.overrides}
    intervention = _score([modified])[0]
    return {
        "baseline": original,
        "intervention": intervention,
        "delta": round(original.risk_score - intervention.risk_score, 4),
        "applied_overrides": req.overrides,
    }


@app.post("/explain", response_model=ExplainResponse)
def explain(shipment: Shipment):
    model, _, _ = get_model()
    if model is None:
        raise HTTPException(503, "model not loaded — run `dvc repro` first")
    record = shipment.model_dump()
    X = to_feature_frame([record])
    pred = _score([record])[0]
    expl = explain_one(model, X)
    return ExplainResponse(prediction=pred, explanation=expl)


@app.get("/summary", response_model=SummaryResponse)
def summary():
    _, _, meta = get_model()
    metrics = meta or {}
    drift = _read_json("drift_report.json")
    registry = _read_json("registry.json")

    # Aggregate the last 24h of prediction_log
    cutoff = time.time() - 24 * 3600
    bands = {"low": 0, "medium": 0, "high": 0}
    scores: list[float] = []
    if PREDICTION_LOG.exists():
        with open(PREDICTION_LOG) as f:
            for line in f:
                try:
                    row = json.loads(line)
                    if row.get("ts", 0) >= cutoff:
                        s = float(row.get("score", 0))
                        scores.append(s)
                        bands[risk_band(s)] += 1
                except Exception:  # noqa: BLE001
                    continue

    return SummaryResponse(
        model_version=metrics.get("model_version"),
        metrics={k: metrics.get(k) for k in
                 ["accuracy", "precision", "recall", "f1", "roc_auc"] if k in metrics},
        prediction_volume_24h=len(scores),
        band_distribution=bands,
        mean_risk=round(sum(scores) / len(scores), 4) if scores else 0.0,
        drift=drift,
        registry=registry,
    )


@app.get("/predictions/recent")
def recent_predictions(limit: int = 50):
    if not PREDICTION_LOG.exists():
        return []
    lines = PREDICTION_LOG.read_text().splitlines()[-limit:]
    out = []
    for line in lines:
        try:
            out.append(json.loads(line))
        except Exception:  # noqa: BLE001
            continue
    return out


@app.get("/health")
def health():
    model, _, meta = get_model()
    return {
        "status": "ok" if model else "model_missing",
        "model_version": meta.get("model_version", "unknown"),
        "run_id": meta.get("run_id"),
        "uptime_hint": time.time(),
    }


@app.get("/metrics")
def metrics_endpoint():
    return {
        "model_metrics": _read_json("metrics.json"),
        "drift": _read_json("drift_report.json"),
        "registry": _read_json("registry.json"),
        "validation": _read_json("validation_report.json"),
    }


@app.get("/artifacts/{name}")
def artifact(name: str):
    allowed = {"confusion_matrix.png", "feature_importance.png", "shap_summary.png"}
    if name not in allowed:
        raise HTTPException(404, "unknown artifact")
    p = ARTIFACTS_DIR / name
    if not p.exists():
        raise HTTPException(404, f"{name} not generated yet")
    return FileResponse(p, media_type="image/png")


@app.get("/")
def root():
    return JSONResponse({
        "service": "Logistics Risk & Intervention API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": ["/predict", "/predict_batch", "/simulate", "/explain",
                      "/summary", "/health", "/metrics", "/predictions/recent",
                      "/artifacts/{name}"],
    })


def _read_json(name: str) -> dict:
    p = ARTIFACTS_DIR / name
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except Exception:  # noqa: BLE001
        return {}
