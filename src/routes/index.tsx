import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, Cpu, Database, GitBranch } from "lucide-react";

import { Kpi, PageHeader, Panel } from "@/components/ui-bits";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARGO — Operations Dashboard" },
      {
        name: "description",
        content:
          "Live shipment-delay risk KPIs, model health, drift status, and prediction volume in one console.",
      },
    ],
  }),
  component: Dashboard,
});

const COLORS = {
  low: "var(--risk-low)",
  medium: "var(--risk-med)",
  high: "var(--risk-high)",
};

function Dashboard() {
  const summaryQ = useQuery({
    queryKey: ["summary"],
    queryFn: api.summary,
    refetchInterval: 15000,
  });
  const recentQ = useQuery({
    queryKey: ["recent"],
    queryFn: () => api.recent(60),
    refetchInterval: 15000,
  });

  const s = summaryQ.data;
  const metrics = s?.metrics ?? {};
  const bands = s?.band_distribution ?? { low: 0, medium: 0, high: 0 };
  const total = bands.low + bands.medium + bands.high || 1;

  const pieData = [
    { name: "Low", value: bands.low, key: "low" },
    { name: "Medium", value: bands.medium, key: "medium" },
    { name: "High", value: bands.high, key: "high" },
  ];

  const series = bucketByMinute(recentQ.data ?? []);

  const driftBreach = s?.drift?.retrain_required;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Real-time delay-risk telemetry from the production model. Refreshes every 15s."
        actions={
          <div className="flex gap-2">
            <Link
              to="/predict"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Score a shipment <ArrowRight className="size-4" />
            </Link>
          </div>
        }
      />

      {summaryQ.isError && (
        <Panel className="border-[var(--risk-high)]/40">
          <div className="flex items-start gap-3 text-sm">
            <AlertTriangle className="size-5 text-[var(--risk-high)] mt-0.5" />
            <div>
              <div className="font-medium">Cannot reach the API</div>
              <div className="text-muted-foreground mt-1">
                Set <code className="mono">VITE_API_URL</code> at build time, or update the API URL in
                the sidebar footer to point at your FastAPI deployment (e.g.{" "}
                <code className="mono">https://your-api.onrender.com</code>).
              </div>
            </div>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Predictions / 24h" value={s?.prediction_volume_24h ?? "—"} />
        <Kpi
          label="Mean risk"
          value={s ? s.mean_risk.toFixed(2) : "—"}
          tone={s && s.mean_risk >= 0.6 ? "high" : s && s.mean_risk >= 0.4 ? "med" : "low"}
        />
        <Kpi
          label="ROC-AUC"
          value={metrics.roc_auc ? metrics.roc_auc.toFixed(3) : "—"}
          hint={metrics.f1 ? `F1 ${metrics.f1.toFixed(3)}` : undefined}
        />
        <Kpi
          label="Drift status"
          value={driftBreach ? "Breach" : "Healthy"}
          tone={driftBreach ? "high" : "low"}
          hint={
            s?.drift?.mean_confidence
              ? `confidence ${(s.drift.mean_confidence * 100).toFixed(1)}%`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Risk band distribution" subtitle="Last 24h predictions" className="lg:col-span-1">
          {total === 0 ? (
            <Empty hint="No predictions yet. Score a shipment to populate." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={85} stroke="none">
                    {pieData.map((d) => (
                      <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {pieData.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: COLORS[d.key as keyof typeof COLORS] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="mono ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Prediction throughput"
          subtitle="Bucketed by minute (last 60 predictions)"
          className="lg:col-span-2"
        >
          {series.length === 0 ? (
            <Empty hint="No prediction log yet." />
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Area dataKey="n" stroke="var(--primary)" fill="url(#g1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Panel title="Model card">
          <dl className="text-sm space-y-2.5">
            <Row icon={<Cpu className="size-4" />} k="Algorithm" v="XGBoost (tree_hist)" />
            <Row icon={<GitBranch className="size-4" />} k="Version" v={s?.model_version ?? "—"} />
            <Row
              icon={<Database className="size-4" />}
              k="Registry"
              v={s?.registry?.latest_version ?? "local"}
            />
            <Row
              icon={<CheckCircle2 className="size-4" />}
              k="Accuracy"
              v={metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : "—"}
            />
          </dl>
        </Panel>
        <Panel title="Quality metrics">
          <table className="w-full text-sm">
            <tbody>
              {(["accuracy", "precision", "recall", "f1", "roc_auc"] as const).map((m) => (
                <tr key={m} className="border-b border-border/50 last:border-0">
                  <td className="py-2 text-muted-foreground capitalize">{m.replace("_", "-")}</td>
                  <td className="py-2 text-right mono">
                    {metrics[m] != null ? metrics[m]!.toFixed(3) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Capability map">
          <ul className="text-sm space-y-2 text-muted-foreground">
            <CapLink to="/predict" label="Score a single shipment" />
            <CapLink to="/batch" label="Bulk score from CSV" />
            <CapLink to="/simulate" label="What-if intervention" />
            <CapLink to="/explain" label="SHAP explanation" />
            <CapLink to="/monitor" label="Drift & confidence" />
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Row({ icon, k, v }: { icon: React.ReactNode; k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-24">{k}</span>
      <span className="mono ml-auto truncate" title={String(v)}>
        {v}
      </span>
    </div>
  );
}

function CapLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to as any}
        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted hover:text-foreground"
      >
        <span>{label}</span>
        <ArrowRight className="size-3.5" />
      </Link>
    </li>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="h-64 grid place-items-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
      {hint}
    </div>
  );
}

const chartTooltip = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
} as const;

function bucketByMinute(rows: any[]) {
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const d = new Date((r.ts ?? 0) * 1000);
    const k = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort()
    .map(([t, n]) => ({ t, n }));
}
