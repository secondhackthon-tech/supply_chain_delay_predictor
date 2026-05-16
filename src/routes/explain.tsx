import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, Panel, RiskBadge } from "@/components/ui-bits";
import { ShipmentForm } from "@/components/ShipmentForm";
import { api, defaultShipment, type ExplainResponse, type Shipment } from "@/lib/api";

export const Route = createFileRoute("/explain")({
  head: () => ({
    meta: [
      { title: "Explainability — ARGO" },
      {
        name: "description",
        content:
          "Per-prediction SHAP attributions plus global feature importance and confusion matrix from the latest training run.",
      },
    ],
  }),
  component: ExplainPage,
});

function ExplainPage() {
  const [s, setS] = useState<Shipment>(defaultShipment);
  const [res, setRes] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      setRes(await api.explain(s));
      toast.success("Explanation computed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const bars =
    res?.explanation.contributions
      .slice()
      .reverse()
      .map((c) => ({ name: shorten(c.feature), value: c.contribution })) ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Explainability"
        description="Why did the model say what it said? Per-prediction SHAP contributions show which features pushed the risk score up (red) or down (green)."
      />

      <Panel title="Shipment">
        <ShipmentForm value={s} onChange={setS} disabled={loading} />
        <div className="mt-5 flex justify-end">
          <button
            onClick={run}
            disabled={loading}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Explaining…" : "Explain prediction"}
          </button>
        </div>
      </Panel>

      {res && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel title="Prediction">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Risk</span>
              <RiskBadge band={res.prediction.risk_band} />
            </div>
            <div className="kpi-num text-5xl font-semibold mt-2">
              {(res.prediction.risk_score * 100).toFixed(1)}
              <span className="text-xl text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 mono">
              method: {res.explanation.method}
            </div>
            <div className="text-xs text-muted-foreground mono">
              base value: {res.explanation.base_value.toFixed(3)}
            </div>
            <p className="text-xs leading-relaxed mt-3">{res.prediction.recommended_action}</p>
          </Panel>

          <Panel title="Top contributions" className="lg:col-span-2">
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={bars} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => Number(v).toFixed(4)}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {bars.map((b, i) => (
                      <Cell
                        key={i}
                        fill={b.value >= 0 ? "var(--risk-high)" : "var(--risk-low)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Positive bars push risk <strong>up</strong>; negative bars push it <strong>down</strong>.
            </p>
          </Panel>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ArtifactPanel title="Global feature importance" name="feature_importance.png" />
        <ArtifactPanel title="SHAP summary" name="shap_summary.png" />
        <ArtifactPanel title="Confusion matrix" name="confusion_matrix.png" />
      </div>
    </div>
  );
}

function ArtifactPanel({
  title,
  name,
}: {
  title: string;
  name: "confusion_matrix.png" | "feature_importance.png" | "shap_summary.png";
}) {
  const [errored, setErrored] = useState(false);
  return (
    <Panel title={title}>
      {errored ? (
        <div className="h-48 grid place-items-center text-xs text-muted-foreground border border-dashed border-border rounded">
          Artifact not generated yet.
        </div>
      ) : (
        <img
          src={api.artifactUrl(name)}
          alt={title}
          loading="lazy"
          onError={() => setErrored(true)}
          className="w-full h-auto rounded bg-white"
        />
      )}
    </Panel>
  );
}

function shorten(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
