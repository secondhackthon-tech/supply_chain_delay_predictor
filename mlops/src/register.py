"""Promote the latest run's model to the MLflow Model Registry under alias `latest`.

Falls back gracefully when MLflow tracking is not configured (e.g. local-only run).
"""
from __future__ import annotations

import os
from pathlib import Path

from .config import ARTIFACTS_DIR, PARAMS
from .utils.io import load_json, save_json
from .utils.logger import get_logger

log = get_logger("register")


def main() -> None:
    metrics = load_json(ARTIFACTS_DIR / "metrics.json")
    run_id = metrics.get("run_id")
    name = PARAMS["mlflow"]["registered_model"]

    uri = os.getenv("MLFLOW_TRACKING_URI", PARAMS["mlflow"]["tracking_uri"])
    if not run_id or "<USER>" in uri or "<REPO>" in uri:
        log.warning("MLflow registry not configured — skipping registration (local mode).")
        save_json(ARTIFACTS_DIR / "registry.json", {
            "name": name, "latest_version": "local",
            "run_id": run_id, "note": "registry skipped (no remote configured)",
        })
        return

    try:
        import mlflow
        from mlflow import MlflowClient

        mlflow.set_tracking_uri(uri)
        client = MlflowClient()
        model_uri = f"runs:/{run_id}/model"
        mv = mlflow.register_model(model_uri=model_uri, name=name)
        log.info("registered %s v%s", name, mv.version)

        try:
            current = client.get_model_version_by_alias(name, "latest")
            Path(ARTIFACTS_DIR / "rollback_version.txt").write_text(str(current.version))
        except Exception:
            pass

        try:
            client.set_registered_model_alias(name, "latest", mv.version)
        except Exception as e:  # noqa: BLE001
            log.warning("alias set failed (registry may not support aliases): %s", e)

        save_json(ARTIFACTS_DIR / "registry.json", {
            "name": name, "latest_version": str(mv.version), "run_id": run_id,
        })
    except Exception as e:  # noqa: BLE001
        log.warning("registration failed: %s", e)
        save_json(ARTIFACTS_DIR / "registry.json", {
            "name": name, "latest_version": "error", "run_id": run_id, "error": str(e),
        })


if __name__ == "__main__":
    main()
