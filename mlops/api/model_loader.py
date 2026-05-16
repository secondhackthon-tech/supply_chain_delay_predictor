"""Lazy model loader with hot-reload on file mtime change."""
from __future__ import annotations

import threading

import joblib
import pandas as pd

from src.config import ARTIFACTS_DIR, MODELS_DIR
from src.features import build
from src.utils.io import load_json

_lock = threading.Lock()
_state = {"model": None, "features": None, "mtime": 0.0, "meta": {}}


def _load() -> None:
    model_path = MODELS_DIR / "model.pkl"
    feats_path = MODELS_DIR / "preprocessor.pkl"
    metrics_path = ARTIFACTS_DIR / "metrics.json"
    if not model_path.exists() or not feats_path.exists():
        return
    mtime = model_path.stat().st_mtime
    if _state["model"] is not None and mtime == _state["mtime"]:
        return
    _state["model"] = joblib.load(model_path)
    _state["features"] = joblib.load(feats_path)
    _state["mtime"] = mtime
    _state["meta"] = load_json(metrics_path) if metrics_path.exists() else {}


def get_model():
    with _lock:
        _load()
    return _state["model"], _state["features"], _state["meta"]


def to_feature_frame(records: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(records)
    feats = build(df)
    _, feature_cols, _ = get_model()
    if feature_cols is None:
        return feats
    return feats.reindex(columns=feature_cols, fill_value=0)


def recommend_action(risk: float, shipment: dict) -> str:
    mode = shipment.get("Mode_of_Shipment", "Ship")
    if risk >= 0.7:
        actions = ["Switch to Flight", "Assign priority handler",
                   "Notify customer proactively", "Add shipping insurance"]
        return "HIGH RISK — " + "; ".join(actions) + "."
    if risk >= 0.4:
        faster = "Flight" if mode == "Ship" else "Ship" if mode == "Road" else mode
        return (f"MEDIUM RISK — Increase warehouse priority; "
                f"consider switching from {mode} to {faster}.")
    return "LOW RISK — Proceed with standard dispatch."


def risk_band(risk: float) -> str:
    return "high" if risk >= 0.7 else "medium" if risk >= 0.4 else "low"


def estimated_delay_days(risk: float, shipment: dict) -> float:
    """Heuristic delay estimator: scales with risk + heavy/cheap-mode penalty."""
    base = risk * 4.0  # 0..4 days from pure risk
    mode = shipment.get("Mode_of_Shipment", "Ship")
    mode_penalty = {"Ship": 1.0, "Road": 0.5, "Flight": 0.0}.get(mode, 0.5)
    weight_factor = min(float(shipment.get("Weight_in_gms", 1500)) / 7500.0, 1.0)
    return round(base + mode_penalty * (0.5 + weight_factor), 2)
