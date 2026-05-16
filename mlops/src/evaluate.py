"""Evaluate stage: confusion matrix, feature importance, SHAP summary."""
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import ConfusionMatrixDisplay
from sklearn.model_selection import train_test_split

from .config import ARTIFACTS_DIR, MODELS_DIR, PARAMS, ROOT
from .utils.logger import get_logger

log = get_logger("evaluate")


def main() -> None:
    model = joblib.load(MODELS_DIR / "model.pkl")
    df = pd.read_parquet(ROOT / PARAMS["data"]["features_path"])
    target = PARAMS["data"]["target"]
    y = df[target].astype(int)
    X = df.drop(columns=[target])
    _, X_test, _, y_test = train_test_split(
        X, y,
        test_size=PARAMS["data"]["test_size"],
        random_state=PARAMS["data"]["random_state"],
        stratify=y,
    )

    preds = (model.predict_proba(X_test)[:, 1] >= PARAMS["evaluate"]["threshold"]).astype(int)

    ConfusionMatrixDisplay.from_predictions(y_test, preds)
    plt.title("Confusion Matrix — Logistics Risk")
    plt.savefig(ARTIFACTS_DIR / "confusion_matrix.png", dpi=120, bbox_inches="tight")
    plt.close()

    importances = pd.Series(model.feature_importances_, index=X.columns).sort_values(ascending=True).tail(15)
    importances.plot(kind="barh", figsize=(8, 6), color="#5b8def")
    plt.title("Top Feature Importances")
    plt.tight_layout()
    plt.savefig(ARTIFACTS_DIR / "feature_importance.png", dpi=120)
    plt.close()

    try:
        explainer = shap.TreeExplainer(model)
        sample = X_test.sample(min(500, len(X_test)), random_state=0)
        shap_values = explainer.shap_values(sample)
        shap.summary_plot(shap_values, sample, show=False, max_display=15)
        plt.tight_layout()
        plt.savefig(ARTIFACTS_DIR / "shap_summary.png", dpi=120, bbox_inches="tight")
        plt.close()
    except Exception as e:  # SHAP can be picky in CI
        log.warning("shap plot skipped: %s", e)
        plt.figure(); plt.text(0.5, 0.5, "SHAP unavailable", ha="center"); plt.axis("off")
        plt.savefig(ARTIFACTS_DIR / "shap_summary.png"); plt.close()

    log.info("evaluation artifacts written to %s", ARTIFACTS_DIR)


if __name__ == "__main__":
    main()
