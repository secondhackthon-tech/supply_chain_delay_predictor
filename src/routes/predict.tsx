import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";

import { PageHeader, Panel, RiskBadge } from "@/components/ui-bits";
import { ShipmentForm } from "@/components/ShipmentForm";
import { api, defaultShipment, type Prediction, type Shipment } from "@/lib/api";

export const Route = createFileRoute("/predict")({
  head: () => ({
    meta: [
      { title: "Predict — ARGO" },
      {
        name: "description",
        content: "Score a single shipment for delay risk and receive a recommended intervention.",
      },
    ],
  }),
  component: PredictPage,
});

function PredictPage() {
  const [shipment, setShipment] = useState<Shipment>(defaultShipment);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await api.predict(shipment);
      setResult(r);
      toast.success(`Scored — ${(r.risk_score * 100).toFixed(1)}% risk`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Single-shipment prediction"
        description="Enter shipment attributes; the model returns the delay-risk score, band, recommended action, and an estimated delay in days."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Panel title="Shipment attributes" className="lg:col-span-3">
          <ShipmentForm value={shipment} onChange={setShipment} disabled={loading} />
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => {
                setShipment(defaultShipment);
                setResult(null);
              }}
              className="px-4 py-2 rounded-md text-sm border border-border hover:bg-muted"
            >
              Reset
            </button>
            <button
              onClick={run}
              disabled={loading}
              className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Scoring…" : "Predict risk"}
            </button>
          </div>
        </Panel>

        <Panel title="Result" className="lg:col-span-2">
          {!result ? (
            <div className="h-64 grid place-items-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
              <div className="text-center">
                <Truck className="size-8 mx-auto mb-2 opacity-50" />
                Submit a shipment to see the risk assessment.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Risk score
                  </span>
                  <RiskBadge band={result.risk_band} />
                </div>
                <div className="kpi-num text-5xl font-semibold">
                  {(result.risk_score * 100).toFixed(1)}
                  <span className="text-xl text-muted-foreground">%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(result.risk_score * 100, 100)}%`,
                      backgroundColor:
                        result.risk_band === "high"
                          ? "var(--risk-high)"
                          : result.risk_band === "medium"
                            ? "var(--risk-med)"
                            : "var(--risk-low)",
                    }}
                  />
                </div>
              </div>

              <Stat label="Estimated delay" value={`${result.estimated_delay_days} days`} />
              <Stat label="Model version" value={<span className="mono">{result.model_version}</span>} />

              <div className="panel p-3 bg-muted/30">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Recommended action
                </div>
                <p className="text-sm leading-relaxed">{result.recommended_action}</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
