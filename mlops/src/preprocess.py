"""Preprocess: drop ID, deduplicate, normalize column names, output clean CSV."""
import pandas as pd
from .config import PARAMS, ROOT
from .utils.logger import get_logger

log = get_logger("preprocess")

def main() -> None:
    df = pd.read_csv(ROOT / PARAMS["data"]["raw_path"])
    drop_cols = [c for c in PARAMS["preprocess"]["drop_columns"] if c in df.columns]
    df = df.drop(columns=drop_cols).drop_duplicates()

    out = ROOT / PARAMS["data"]["processed_path"]
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=False)
    log.info("wrote clean dataset: %s rows=%d", out, len(df))

if __name__ == "__main__":
    main()
