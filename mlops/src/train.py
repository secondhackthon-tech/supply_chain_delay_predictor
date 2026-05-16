"""Training stage: trains XGBoost, logs to MLflow (+DagsHub), saves model.pkl."""
import json
import os
from pathlib import Path

import joblib
import mlflow
import mlflow.xgboost
import pandas as pd
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from .config import ARTIFACTS_DIR, MODELS_DIR, PARAMS, ROOT
from .utils.io import save_json
from .utils.logger import get_logger

log = get_logger("train")


def setup_mlflow() -> None:
    uri = os.getenv("MLFLOW_TRACKING_URI", PARAMS["mlflow"]["tracking_uri"])
    mlflow.set_tracking_uri(uri)
    mlflow.set_experiment(PARAMS["mlflow"]["experiment"])
    log.info("mlflow tracking → %s", uri)


def main() -> None:
    setup_mlflow()

    df = pd.read_parquet(ROOT / PARAMS["data"]["features_path"])
    target = PARAMS["data"]["target"]
    y = df[target].astype(int)
    X = df.drop(columns=[target])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=PARAMS["data"]["test_size"],
        random_state=PARAMS["data"]["random_state"],
        stratify=y,
    )

    params = PARAMS["train"]["params"]

    with mlflow.start_run() as run:
        mlflow.log_params(params)
        mlflow.log_param("model", PARAMS["train"]["model"])
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_test", len(X_test))

        model = XGBClassifier(**params, random_state=PARAMS["data"]["random_state"])
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

        proba = model.predict_proba(X_test)[:, 1]
        preds = (proba >= PARAMS["evaluate"]["threshold"]).astype(int)

        metrics = {
            "accuracy": float(accuracy_score(y_test, preds)),
            "precision": float(precision_score(y_test, preds)),
            "recall": float(recall_score(y_test, preds)),
            "f1": float(f1_score(y_test, preds)),
            "roc_auc": float(roc_auc_score(y_test, proba)),
        }
        mlflow.log_metrics(metrics)

        # Persist model + feature schema
        joblib.dump(model, MODELS_DIR / "model.pkl")
        joblib.dump(list(X.columns), MODELS_DIR / "preprocessor.pkl")
        mlflow.xgboost.log_model(model, artifact_path="model")

        save_json(ARTIFACTS_DIR / "metrics.json", {
            **metrics,
            "run_id": run.info.run_id,
            "model_version": run.info.run_id[:8],
            "features": list(X.columns),
        })
        log.info("trained run=%s metrics=%s", run.info.run_id, metrics)


if __name__ == "__main__":
    main()
