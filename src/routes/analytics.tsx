import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, Panel } from "@/components/ui-bits";
import { api } from "@/lib/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ARGO" },
      {
        name: "description",
        content: "Time series of risk scores from the recent prediction log.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const q = useQuery({
    queryKey: ["recent-full"],
    queryFn: () => api.recent(200),
    refetchInterval: 20000,
  });
  const rows = (q.data ?? [])
    .filter((r) => typeof r.score === "number")
    .map((r, i) => ({
      i,
      ts: new Date((r.ts ?? 0) * 1000).toLocaleTimeString(),
      risk: Number(r.score),
      mode: r.input?.Mode_of_Shipment,
    }));

  const byMode = rows.reduce(
    (acc, r) => {
      acc[r.mode || "?"] = (acc[r.mode || "?"] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const avg = rows.length ? rows.reduce((s, r) => s + r.risk, 0) / rows.length : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Analytics"
        description="Recent prediction log. Each point is one /predict call; the line tracks risk over time."
      />

      <Panel title={`Risk over last ${rows.length} predictions`} subtitle={`mean ${avg.toFixed(3)}`}>
        {rows.length === 0 ? (
          <div className="h-64 grid place-items-center text-sm text-muted-foreground border border-dashed border-border rounded">
            No predictions yet.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer>
              <LineChart data={rows}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="ts"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis domain={[0, 1]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => Number(v).toFixed(3)}
                />
                <Line type="monotone" dataKey="risk" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="Mode mix in the prediction log">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-2">Mode</th>
              <th className="text-right py-2">Count</th>
              <th className="text-right py-2">Share</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byMode).map(([mode, count]) => (
              <tr key={mode} className="border-b border-border/40">
                <td className="py-2">{mode}</td>
                <td className="py-2 text-right mono">{count}</td>
                <td className="py-2 text-right mono">
                  {rows.length ? `${((count / rows.length) * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
            {Object.keys(byMode).length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-muted-foreground">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
