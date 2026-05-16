"""Drift + confidence monitoring.

Emits artifacts/drift_report.json. Exits 1 on breach so the retrain workflow
can trigger from the exit code.

Robust to a fresh deployment where only model.pkl + preprocessor.pkl exist
(features.parquet pulled lazily or absent).
"""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .config import ARTIFACTS_DIR, MODELS_DIR, PARAMS, ROOT
from .utils.io import save_json
from .utils.logger import get_logger

log = get_logger("monitor")


def psi(reference: np.ndarray, current: np.ndarray, bins: int = 10) -> float:
    ref = pd.Series(reference).dropna().astype(float)
    cur = pd.Series(current).dropna().astype(float)
    if ref.empty or cur.empty:
        return 0.0
    edges = np.linspace(ref.min(), ref.max(), bins + 1)
    if not np.isfinite(edges).all() or len(np.unique(edges)) < 2:
        return 0.0
    r, _ = np.histogram(ref, bins=edges)
    c, _ = np.histogram(cur, bins=edges)
    r = r / max(r.sum(), 1) + 1e-6
    c = c / max(c.sum(), 1) + 1e-6
    return float(np.sum((c - r) * np.log(c / r)))


def _load_reference() -> pd.DataFrame | None:
    feats = ROOT / PARAMS["data"]["features_path"]
    if feats.exists():
        return pd.read_parquet(feats)
    return None


def main(live_path: str | None = None) -> None:
    target = PARAMS["data"]["target"]
    ref = _load_reference()
    if ref is None:
        log.warning("no reference features file — skipping drift, marking healthy.")
        save_json(ARTIFACTS_DIR / "drift_report.json", {
            "psi_scores": {}, "drifted_features": {}, "mean_confidence": 1.0,
            "confidence_floor": PARAMS["monitoring"]["confidence_floor"],
            "drift_threshold": PARAMS["monitoring"]["drift_threshold"],
            "retrain_required": False,
            "prediction_distribution": {"high_risk": 0.0, "medium_risk": 0.0, "low_risk": 1.0},
            "note": "no reference data available; pipeline has not been trained yet",
        })
        return

    ref_X = ref.drop(columns=[target], errors="ignore")

    if live_path and Path(live_path).exists():
        live = pd.read_parquet(live_path)
    else:
        rng = np.random.default_rng(7)
        live = ref_X.sample(frac=0.3, random_state=7).copy()
        if "Weight_in_gms" in live.columns:
            live["Weight_in_gms"] = live["Weight_in_gms"] * rng.uniform(0.8, 1.4, len(live))

    num_cols = ref_X.select_dtypes("number").columns
    scores = {c: psi(ref_X[c].values, live[c].values) for c in num_cols if c in live.columns}
    threshold = PARAMS["monitoring"]["drift_threshold"]
    drifted = {k: v for k, v in scores.items() if v > threshold}

    mean_conf = 1.0
    dist = {"high_risk": 0.0, "medium_risk": 0.0, "low_risk": 1.0}
    model_path = MODELS_DIR / "model.pkl"
    feats_path = MODELS_DIR / "preprocessor.pkl"
    if model_path.exists() and feats_path.exists():
        model = joblib.load(model_path)
        feature_cols = joblib.load(feats_path)
        live_aligned = live.reindex(columns=feature_cols, fill_value=0)
        proba = model.predict_proba(live_aligned)[:, 1]
        mean_conf = float(np.mean(np.maximum(proba, 1 - proba)))
        dist = {
            "high_risk": float((proba >= 0.7).mean()),
            "medium_risk": float(((proba >= 0.4) & (proba < 0.7)).mean()),
            "low_risk": float((proba < 0.4).mean()),
        }

    report = {
        "psi_scores": scores,
        "drifted_features": drifted,
        "mean_confidence": mean_conf,
        "confidence_floor": PARAMS["monitoring"]["confidence_floor"],
        "drift_threshold": threshold,
        "retrain_required": bool(drifted) or mean_conf < PARAMS["monitoring"]["confidence_floor"],
        "prediction_distribution": dist,
    }
    save_json(ARTIFACTS_DIR / "drift_report.json", report)
    log.info("drift report: retrain=%s drifted=%s conf=%.3f",
             report["retrain_required"], list(drifted), mean_conf)

    if report["retrain_required"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
