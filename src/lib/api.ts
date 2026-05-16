/**
 * Tiny typed API client for the FastAPI backend.
 * Configure with VITE_API_URL (defaults to http://localhost:8000).
 *
 * In published Lovable previews, set VITE_API_URL to your Render URL,
 * e.g. https://logistics-risk-api.onrender.com
 */

const FALLBACK = "http://localhost:8000";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const override = window.localStorage.getItem("apiBase");
    if (override) return override.replace(/\/$/, "");
  }
  const env = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return (env || FALLBACK).replace(/\/$/, "");
}

export function setApiBase(url: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apiBase", url.replace(/\/$/, ""));
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : (res.text() as any)) as Promise<T>;
}

export type Shipment = {
  Warehouse_block: "A" | "B" | "C" | "D" | "F";
  Mode_of_Shipment: "Flight" | "Ship" | "Road";
  Customer_care_calls: number;
  Customer_rating: number;
  Cost_of_the_Product: number;
  Prior_purchases: number;
  Product_importance: "low" | "medium" | "high";
  Gender: "F" | "M";
  Discount_offered: number;
  Weight_in_gms: number;
};

export const defaultShipment: Shipment = {
  Warehouse_block: "F",
  Mode_of_Shipment: "Ship",
  Customer_care_calls: 4,
  Customer_rating: 3,
  Cost_of_the_Product: 210,
  Prior_purchases: 3,
  Product_importance: "medium",
  Gender: "F",
  Discount_offered: 10,
  Weight_in_gms: 1500,
};

export type Prediction = {
  risk_score: number;
  risk_band: "low" | "medium" | "high";
  recommended_action: string;
  estimated_delay_days: number;
  model_version: string;
};

export type Summary = {
  model_version: string | null;
  metrics: Partial<Record<"accuracy" | "precision" | "recall" | "f1" | "roc_auc", number>>;
  prediction_volume_24h: number;
  band_distribution: { low: number; medium: number; high: number };
  mean_risk: number;
  drift: {
    psi_scores?: Record<string, number>;
    drifted_features?: Record<string, number>;
    mean_confidence?: number;
    confidence_floor?: number;
    drift_threshold?: number;
    retrain_required?: boolean;
    prediction_distribution?: Record<string, number>;
    note?: string;
  };
  registry: { name?: string; latest_version?: string; run_id?: string };
};

export type ExplainResponse = {
  prediction: Prediction;
  explanation: {
    method: string;
    base_value: number;
    contributions: { feature: string; value: number; contribution: number }[];
  };
};

export const api = {
  health: () => request<{ status: string; model_version: string; run_id: string | null }>("/health"),
  summary: () => request<Summary>("/summary"),
  metrics: () => request<any>("/metrics"),
  predict: (s: Shipment) =>
    request<Prediction>("/predict", { method: "POST", body: JSON.stringify(s) }),
  predictBatch: (shipments: Shipment[]) =>
    request<Prediction[]>("/predict_batch", {
      method: "POST",
      body: JSON.stringify({ shipments }),
    }),
  simulate: (base: Shipment, overrides: Partial<Shipment>) =>
    request<{ baseline: Prediction; intervention: Prediction; delta: number; applied_overrides: any }>(
      "/simulate",
      { method: "POST", body: JSON.stringify({ base, overrides }) },
    ),
  explain: (s: Shipment) =>
    request<ExplainResponse>("/explain", { method: "POST", body: JSON.stringify(s) }),
  recent: (limit = 50) => request<any[]>(`/predictions/recent?limit=${limit}`),
  artifactUrl: (name: "confusion_matrix.png" | "feature_importance.png" | "shap_summary.png") =>
    `${getApiBase()}/artifacts/${name}`,
};
