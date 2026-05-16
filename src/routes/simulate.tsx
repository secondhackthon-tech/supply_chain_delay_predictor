import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, FlaskConical, TrendingDown, TrendingUp } from "lucide-react";

import { PageHeader, Panel, RiskBadge } from "@/components/ui-bits";
import { ShipmentForm } from "@/components/ShipmentForm";
import { api, defaultShipment, type Prediction, type Shipment } from "@/lib/api";

export const Route = createFileRoute("/simulate")({
  head: () => ({
    meta: [
      { title: "What-if simulation — ARGO" },
      {
        name: "description",
        content:
          "Test operational interventions before dispatch and see the exact risk delta the model predicts.",
      },
    ],
  }),
  component: SimulatePage,
});

const PRESETS: { label: string; overrides: Partial<Shipment> }[] = [
  { label: "Switch to Flight", overrides: { Mode_of_Shipment: "Flight" } },
  { label: "Cut discount in half", overrides: { Discount_offered: 5 } },
  { label: "Lighter shipment (−40%)", overrides: { Weight_in_gms: 1000 } },
  { label: "Boost care calls to 7", overrides: { Customer_care_calls: 7 } },
  { label: "Mark as high importance", overrides: { Product_importance: "high" } },
];

function SimulatePage() {
  const [base, setBase] = useState<Shipment>({ ...defaultShipment, Weight_in_gms: 4200, Discount_offered: 30 });
  const [overrides, setOverrides] = useState<Partial<Shipment>>({ Mode_of_Shipment: "Flight" });
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<{ baseline: Prediction; intervention: Prediction; delta: number } | null>(null);

  const merged: Shipment = { ...base, ...overrides };

  const run = async () => {
    setLoading(true);
    try {
      const r = await api.simulate(base, overrides);
      setOut(r);
      toast.success(
        r.delta > 0
          ? `Intervention reduces risk by ${(r.delta * 100).toFixed(1)}pp`
          : `Intervention increases risk by ${(-r.delta * 100).toFixed(1)}pp`,
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const setOverride = <K extends keyof Shipment>(k: K, v: Shipment[K]) =>
    setOverrides((o) => ({ ...o, [k]: v }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="What-if simulation"
        description="Pick a baseline shipment, propose an intervention, and ARGO will show the exact change in delay risk."
        actions={
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            <FlaskConical className="size-4" />
            {loading ? "Simulating…" : "Run simulation"}
          </button>
        }
      />

      <Panel title="Baseline shipment">
        <ShipmentForm value={base} onChange={setBase} disabled={loading} />
      </Panel>

      <Panel
        title="Intervention overrides"
        subtitle="Only the fields you change will be applied to the baseline."
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setOverrides(p.overrides)}
              className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted hover:border-primary/50"
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setOverrides({})}
            className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted"
          >
            Clear
          </button>
        </div>
        <ShipmentForm
          value={merged}
          onChange={(s) => {
            const diff: Partial<Shipment> = {};
            (Object.keys(s) as (keyof Shipment)[]).forEach((k) => {
              if (s[k] !== base[k]) (diff as any)[k] = s[k];
            });
            setOverrides(diff);
          }}
          disabled={loading}
        />
        {Object.keys(overrides).length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground mono">
            Applied overrides: {JSON.stringify(overrides)}
          </div>
        )}
      </Panel>

      {out && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResultCard label="Baseline risk" pred={out.baseline} />
          <DeltaCard delta={out.delta} />
          <ResultCard label="After intervention" pred={out.intervention} highlight />
        </div>
      )}
    </div>
  );
}

function ResultCard({
  label,
  pred,
  highlight,
}: {
  label: string;
  pred: Prediction;
  highlight?: boolean;
}) {
  return (
    <Panel className={highlight ? "panel-glow border-primary/40" : ""}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <RiskBadge band={pred.risk_band} />
      </div>
      <div className="kpi-num text-4xl font-semibold mt-3">
        {(pred.risk_score * 100).toFixed(1)}
        <span className="text-lg text-muted-foreground">%</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1.5">
        Est. delay <span className="mono">{pred.estimated_delay_days}d</span>
      </div>
      <p className="text-xs leading-relaxed mt-3 text-muted-foreground">{pred.recommended_action}</p>
    </Panel>
  );
}

function DeltaCard({ delta }: { delta: number }) {
  const improved = delta > 0;
  const color = improved ? "var(--risk-low)" : "var(--risk-high)";
  return (
    <div className="panel p-5 flex flex-col items-center justify-center text-center">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Risk delta</span>
      <div className="flex items-center gap-2 mt-3" style={{ color }}>
        {improved ? <TrendingDown className="size-7" /> : <TrendingUp className="size-7" />}
        <span className="kpi-num text-4xl font-semibold">
          {improved ? "−" : "+"}
          {Math.abs(delta * 100).toFixed(1)}pp
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-3 max-w-[12rem]">
        {improved
          ? "This intervention is predicted to reduce delay risk."
          : "This change would raise delay risk — reconsider."}
      </div>
      <ArrowRight className="size-4 text-muted-foreground mt-3" />
    </div>
  );
}
