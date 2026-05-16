"""Feature engineering: one-hot categoricals + derived ratios. Saves parquet."""
import pandas as pd
from .config import PARAMS, ROOT
from .utils.logger import get_logger

log = get_logger("features")

def build(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Derived features
    df["discount_ratio"] = df["Discount_offered"] / df["Cost_of_the_Product"].clip(lower=1)
    df["weight_per_call"] = df["Weight_in_gms"] / df["Customer_care_calls"].clip(lower=1)
    # One-hot encode
    cats = [c for c in PARAMS["preprocess"]["categorical"] if c in df.columns]
    df = pd.get_dummies(df, columns=cats, drop_first=True)
    return df

def main() -> None:
    df = pd.read_csv(ROOT / PARAMS["data"]["processed_path"])
    feats = build(df)
    out = ROOT / PARAMS["data"]["features_path"]
    out.parent.mkdir(parents=True, exist_ok=True)
    feats.to_parquet(out, index=False)
    log.info("feature matrix: %s shape=%s", out, feats.shape)

if __name__ == "__main__":
    main()
