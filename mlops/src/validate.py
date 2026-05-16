"""Validate stage: schema + null + range checks. Fails the pipeline on violation."""
import pandas as pd
from .config import PARAMS, ROOT, ARTIFACTS_DIR
from .utils.io import save_json
from .utils.logger import get_logger

log = get_logger("validate")

EXPECTED_COLUMNS = {
    "ID", "Warehouse_block", "Mode_of_Shipment", "Customer_care_calls",
    "Customer_rating", "Cost_of_the_Product", "Prior_purchases",
    "Product_importance", "Gender", "Discount_offered", "Weight_in_gms",
    "Reached.on.Time_Y.N",
}

def main() -> None:
    df = pd.read_csv(ROOT / PARAMS["data"]["raw_path"])
    issues: list[str] = []

    missing = EXPECTED_COLUMNS - set(df.columns)
    if missing:
        issues.append(f"missing columns: {missing}")
    if df.isna().any().any():
        issues.append("nulls detected")
    if df[PARAMS["data"]["target"]].nunique() != 2:
        issues.append("target is not binary")

    report = {
        "rows": len(df),
        "cols": df.shape[1],
        "target_balance": df[PARAMS["data"]["target"]].value_counts().to_dict(),
        "issues": issues,
        "status": "passed" if not issues else "failed",
    }
    save_json(ARTIFACTS_DIR / "validation_report.json", report)
    if issues:
        raise ValueError(f"validation failed: {issues}")
    log.info("validation passed: %d rows / %d cols", report["rows"], report["cols"])

if __name__ == "__main__":
    main()
