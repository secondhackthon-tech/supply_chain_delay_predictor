from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class Shipment(BaseModel):
    Warehouse_block: Literal["A", "B", "C", "D", "F"] = "F"
    Mode_of_Shipment: Literal["Flight", "Ship", "Road"] = "Ship"
    Customer_care_calls: int = Field(ge=0, le=10, default=4)
    Customer_rating: int = Field(ge=1, le=5, default=3)
    Cost_of_the_Product: float = Field(gt=0, default=210.0)
    Prior_purchases: int = Field(ge=0, default=3)
    Product_importance: Literal["low", "medium", "high"] = "medium"
    Gender: Literal["F", "M"] = "F"
    Discount_offered: float = Field(ge=0, default=10.0)
    Weight_in_gms: float = Field(gt=0, default=1500.0)


class BatchRequest(BaseModel):
    shipments: List[Shipment]


class Prediction(BaseModel):
    risk_score: float
    risk_band: Literal["low", "medium", "high"]
    recommended_action: str
    estimated_delay_days: float
    model_version: str


class SimulateRequest(BaseModel):
    base: Shipment
    overrides: dict


class ExplainResponse(BaseModel):
    prediction: Prediction
    explanation: dict


class SummaryResponse(BaseModel):
    model_version: Optional[str] = None
    metrics: dict
    prediction_volume_24h: int
    band_distribution: dict
    mean_risk: float
    drift: dict
    registry: dict
