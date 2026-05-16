"""Per-prediction explainability via SHAP TreeExplainer.

Returns the top contributing features (signed contributions) for one shipment.
Falls back to feature_importance if SHAP fails (small environments, etc.).
"""
from __future__ import annotations

import threading
from typing import Any

import numpy as np
import pandas as pd

_explainer_lock = threading.Lock()
_explainer: Any = None
_explainer_for_id: int | None = None


def _get_explainer(model):
    global _explainer, _explainer_for_id
    with _explainer_lock:
        if _explainer is None or _explainer_for_id != id(model):
            import shap
            _explainer = shap.TreeExplainer(model)
            _explainer_for_id = id(model)
        return _explainer


def explain_one(model, X_row: pd.DataFrame, top_k: int = 8) -> dict:
    """X_row: single-row aligned feature frame. Returns top_k signed contributions."""
    try:
        explainer = _get_explainer(model)
        values = explainer.shap_values(X_row)
        # XGBoost binary -> ndarray of shape (1, n_features)
        vals = np.asarray(values)
        if vals.ndim == 3:  # (n_classes, n_samples, n_features)
            vals = vals[1]
        contribs = vals[0]
        base = float(explainer.expected_value if np.ndim(explainer.expected_value) == 0
                     else np.asarray(explainer.expected_value).ravel()[-1])
        method = "shap"
    except Exception:  # noqa: BLE001
        # Fallback: gain-based importance scaled by feature value
        contribs = np.asarray(model.feature_importances_) * X_row.iloc[0].values
        base = 0.0
        method = "feature_importance_fallback"

    feature_names = list(X_row.columns)
    pairs = sorted(
        zip(feature_names, contribs.tolist(), X_row.iloc[0].tolist()),
        key=lambda t: abs(t[1]),
        reverse=True,
    )[:top_k]
    return {
        "method": method,
        "base_value": base,
        "contributions": [
            {"feature": f, "value": float(v), "contribution": float(c)}
            for f, c, v in pairs
        ],
    }
