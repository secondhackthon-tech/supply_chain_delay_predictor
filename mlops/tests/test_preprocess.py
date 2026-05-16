import pandas as pd
from src.features import build

def test_build_creates_derived_features():
    df = pd.DataFrame({
        "Warehouse_block": ["A", "B"],
        "Mode_of_Shipment": ["Ship", "Flight"],
        "Product_importance": ["low", "high"],
        "Gender": ["F", "M"],
        "Customer_care_calls": [2, 4],
        "Customer_rating": [3, 5],
        "Cost_of_the_Product": [100.0, 200.0],
        "Prior_purchases": [1, 3],
        "Discount_offered": [10.0, 20.0],
        "Weight_in_gms": [500.0, 1500.0],
    })
    out = build(df)
    assert "discount_ratio" in out.columns
    assert "weight_per_call" in out.columns
    assert out.shape[0] == 2
