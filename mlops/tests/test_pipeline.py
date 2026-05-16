from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def test_dvc_pipeline_declares_required_stages():
    cfg = yaml.safe_load((ROOT / "dvc.yaml").read_text())
    stages = set(cfg["stages"].keys())
    required = {"ingest", "validate", "preprocess", "features", "train", "evaluate", "register"}
    assert required.issubset(stages)


def test_params_has_mlflow_section():
    p = yaml.safe_load((ROOT / "params.yaml").read_text())
    assert "mlflow" in p and "tracking_uri" in p["mlflow"]


def test_synthetic_ingest_runs(tmp_path, monkeypatch):
    """The ingest stage must be able to bootstrap with no creds and no data."""
    from src import ingest

    fake_root = tmp_path
    raw = fake_root / "data" / "raw" / "customer_analytics.csv"
    monkeypatch.setattr(ingest, "ROOT", fake_root)
    ingest.main()
    assert raw.exists()
    assert raw.stat().st_size > 1000
