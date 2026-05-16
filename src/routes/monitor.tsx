import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Kpi, PageHeader, Panel } from "@/components/ui-bits";
import { api } from "@/lib/api";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      { title: "Monitoring — ARGO" },
      {
        name: "description",
        content: "PSI-based drift, prediction confidence, retrain status and validation report.",
      },
    ],
  }),
  component: MonitorPage,
});

function MonitorPage() {
  const q = useQuery({ queryKey: ["summary"], queryFn: api.summary, refetchInterval: 15000 });
  const m = useQuery({ queryKey: ["metrics"], queryFn: api.metrics, refetchInterval: 30000 });
  const s = q.data;
  const drift = s?.drift ?? {};

  const psi = Object.entries(drift.psi_scores ?? {}).map(([feature, score]) => ({
    feature: shorten(feature),
    score: Number(score),
    drifted: Number(score) > (drift.drift_threshold ?? 0.2),
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Monitoring"
        description="Live drift, confidence, and registry status. The retrain workflow fires automatically when any signal breaches its threshold."
        actions={
          <button
            onClick={() => {
              q.refetch();
              m.refetch();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-sm hover:bg-muted"
          >
            <RefreshCw className={`size-4 ${q.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Drift status"
          value={drift.retrain_required ? "Breach" : "Healthy"}
          tone={drift.retrain_required ? "high" : "low"}
        />
        <Kpi
          label="Mean confidence"
          value={drift.mean_confidence != null ? (drift.mean_confidence * 100).toFixed(1) + "%" : "—"}
          hint={
            drift.confidence_floor != null
              ? `floor ${(drift.confidence_floor * 100).toFixed(0)}%`
              : undefined
          }
          tone={
            drift.mean_confidence != null && drift.confidence_floor != null
              ? drift.mean_confidence < drift.confidence_floor
                ? "high"
                : "low"
              : "default"
          }
        />
        <Kpi label="Drifted features" value={Object.keys(drift.drifted_features ?? {}).length} />
        <Kpi label="PSI threshold" value={drift.drift_threshold?.toFixed(2) ?? "—"} />
      </div>

      <Panel
        title="Population Stability Index per feature"
        subtitle="Bars above the dashed threshold are considered drifted."
      >
        {psi.length === 0 ? (
          <div className="h-60 grid place-items-center text-sm text-muted-foreground border border-dashed border-border rounded">
            No PSI data — run the pipeline and the monitor job first.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={psi} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="feature"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => Number(v).toFixed(4)}
                />
                <ReferenceLine
                  y={drift.drift_threshold ?? 0.2}
                  stroke="var(--risk-high)"
                  strokeDasharray="4 4"
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {psi.map((d, i) => (
                    <Cell key={i} fill={d.drifted ? "var(--risk-high)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Retraining policy">
          <ul className="text-sm space-y-3">
            <PolicyRow
              ok={!drift.retrain_required}
              text="PSI score under threshold for every feature"
            />
            <PolicyRow
              ok={
                drift.mean_confidence == null ||
                drift.confidence_floor == null ||
                drift.mean_confidence >= drift.confidence_floor
              }
              text="Mean prediction confidence above floor"
            />
            <li className="flex items-start gap-2.5 text-muted-foreground text-xs pt-1">
              <Activity className="size-4 mt-0.5" />
              On breach, GitHub Actions workflow{" "}
              <code className="mono">retrain.yml</code> calls{" "}
              <code className="mono">train.yml</code> via{" "}
              <code className="mono">workflow_call</code>.
            </li>
          </ul>
        </Panel>

        <Panel title="Validation report">
          {m.data?.validation && Object.keys(m.data.validation).length > 0 ? (
            <pre className="text-xs mono p-3 rounded bg-muted/40 overflow-x-auto max-h-72">
              {JSON.stringify(m.data.validation, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-muted-foreground">No validation report on disk.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function PolicyRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="size-4 text-[var(--risk-low)] mt-0.5" />
      ) : (
        <AlertTriangle className="size-4 text-[var(--risk-high)] mt-0.5" />
      )}
      <span>{text}</span>
    </li>
  );
}

function shorten(s: string, max = 18) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
