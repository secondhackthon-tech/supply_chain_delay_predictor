"""Ingest stage.

Priority:
  1. If the raw CSV already exists at data/raw/customer_analytics.csv, reuse it.
  2. Else, if KAGGLE_USERNAME + KAGGLE_KEY are set, download from Kaggle
     (prachi13/customer-analytics).
  3. Else, generate a deterministic synthetic dataset with the same schema so
     the pipeline can run end-to-end with zero manual setup (demo / CI).

This makes `dvc repro` work on a fresh clone without any credentials.
"""
from __future__ import annotations

import os
import subprocess
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

from .config import PARAMS, ROOT
from .utils.logger import get_logger

log = get_logger("ingest")

KAGGLE_SLUG = "prachi13/customer-analytics"


def _try_kaggle(raw_path: Path) -> bool:
    if not (os.getenv("KAGGLE_USERNAME") and os.getenv("KAGGLE_KEY")):
        return False
    try:
        target_dir = raw_path.parent
        target_dir.mkdir(parents=True, exist_ok=True)
        log.info("downloading %s from Kaggle...", KAGGLE_SLUG)
        subprocess.run(
            ["kaggle", "datasets", "download", "-d", KAGGLE_SLUG, "-p", str(target_dir), "--force"],
            check=True,
        )
        # Unzip whatever it dropped
        for z in target_dir.glob("*.zip"):
            with zipfile.ZipFile(z) as zf:
                zf.extractall(target_dir)
            z.unlink()
        # The Kaggle file is typically Train.csv — rename
        for cand in ["Train.csv", "train.csv", "customer_analytics.csv"]:
            p = target_dir / cand
            if p.exists():
                p.rename(raw_path)
                return True
        return raw_path.exists()
    except Exception as e:  # noqa: BLE001
        log.warning("kaggle download failed: %s", e)
        return False


def _synthetic(n: int = 11_000, seed: int = 42) -> pd.DataFrame:
    """Generate a deterministic dataset that mirrors the Kaggle schema."""
    rng = np.random.default_rng(seed)
    n = int(n)
    warehouse = rng.choice(list("ABCDF"), n)
    mode = rng.choice(["Flight", "Ship", "Road"], n, p=[0.2, 0.65, 0.15])
    importance = rng.choice(["low", "medium", "high"], n, p=[0.55, 0.35, 0.10])
    gender = rng.choice(["F", "M"], n)
    care_calls = rng.integers(0, 8, n)
    rating = rng.integers(1, 6, n)
    cost = rng.normal(210, 50, n).clip(50, 400).round(0)
    prior = rng.integers(2, 11, n)
    discount = rng.integers(1, 65, n)
    weight = rng.normal(3500, 1800, n).clip(1000, 7500).round(0)

    # Latent risk: heavier + cheaper Ship + high discount + low prior + few care_calls -> late
    risk = (
        0.0009 * weight
        + 0.025 * discount
        + (mode == "Ship") * 0.6
        + (mode == "Road") * 0.3
        - 0.08 * prior
        - 0.04 * care_calls
        + (importance == "low") * 0.25
        - 1.4
    )
    p = 1.0 / (1.0 + np.exp(-risk))
    target = (rng.random(n) < p).astype(int)

    return pd.DataFrame({
        "ID": np.arange(1, n + 1),
        "Warehouse_block": warehouse,
        "Mode_of_Shipment": mode,
        "Customer_care_calls": care_calls,
        "Customer_rating": rating,
        "Cost_of_the_Product": cost.astype(int),
        "Prior_purchases": prior,
        "Product_importance": importance,
        "Gender": gender,
        "Discount_offered": discount,
        "Weight_in_gms": weight.astype(int),
        "Reached.on.Time_Y.N": target,
    })


def main() -> None:
    raw_path = ROOT / PARAMS["data"]["raw_path"]
    raw_path.parent.mkdir(parents=True, exist_ok=True)

    if raw_path.exists():
        log.info("raw dataset present: %s (%.1f KB)", raw_path, raw_path.stat().st_size / 1024)
        return

    if _try_kaggle(raw_path):
        log.info("ingested from Kaggle: %s", raw_path)
        return

    log.warning("no Kaggle creds and no local CSV — generating synthetic dataset.")
    df = _synthetic()
    df.to_csv(raw_path, index=False)
    log.info("wrote synthetic raw dataset: %s rows=%d", raw_path, len(df))


if __name__ == "__main__":
    main()
