import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import { PageHeader, Panel, RiskBadge } from "@/components/ui-bits";
import { api, defaultShipment, type Prediction, type Shipment } from "@/lib/api";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "Batch scoring — ARGO" },
      {
        name: "description",
        content: "Upload or paste a CSV of shipments and score them all in one call.",
      },
    ],
  }),
  component: BatchPage,
});

const SAMPLE_CSV = `Warehouse_block,Mode_of_Shipment,Customer_care_calls,Customer_rating,Cost_of_the_Product,Prior_purchases,Product_importance,Gender,Discount_offered,Weight_in_gms
F,Ship,4,3,210,3,medium,F,10,1500
A,Flight,2,4,300,5,high,M,5,800
D,Road,5,2,150,1,low,F,40,4500
B,Ship,3,3,220,2,medium,M,25,3200
C,Ship,6,1,180,2,low,F,55,5500`;

function BatchPage() {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [results, setResults] = useState<{ input: Shipment; pred: Prediction }[]>([]);
  const [loading, setLoading] = useState(false);

  const parseCsv = (text: string): Shipment[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV needs at least a header + one row");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).filter(Boolean).map((line, i) => {
      const cells = line.split(",").map((c) => c.trim());
      const obj: any = { ...defaultShipment };
      headers.forEach((h, idx) => {
        const v = cells[idx];
        if (v === undefined) return;
        const numeric = ["Customer_care_calls", "Customer_rating", "Cost_of_the_Product",
                         "Prior_purchases", "Discount_offered", "Weight_in_gms"];
        obj[h] = numeric.includes(h) ? Number(v) : v;
      });
      if (Number.isNaN(obj.Cost_of_the_Product)) throw new Error(`Row ${i + 2}: invalid numeric value`);
      return obj as Shipment;
    });
  };

  const score = async () => {
    setLoading(true);
    try {
      const shipments = parseCsv(csv);
      const preds = await api.predictBatch(shipments);
      setResults(shipments.map((s, i) => ({ input: s, pred: preds[i] })));
      toast.success(`Scored ${preds.length} shipments`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setCsv(text);
  };

  const counts = results.reduce(
    (acc, r) => {
      acc[r.pred.risk_band]++;
      return acc;
    },
    { low: 0, medium: 0, high: 0 } as Record<string, number>,
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Batch scoring"
        description="Score a fleet of shipments at once. Paste a CSV or upload a file — the header row must match the field names below."
        actions={
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm hover:bg-muted">
            <Upload className="size-4" /> Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        }
      />

      <Panel title="Input CSV">
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          spellCheck={false}
          className="w-full h-56 px-3 py-2 rounded-md bg-input border border-border text-xs mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setCsv(SAMPLE_CSV)}
            className="px-4 py-2 rounded-md text-sm border border-border hover:bg-muted"
          >
            Load sample
          </button>
          <button
            onClick={score}
            disabled={loading}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Scoring…" : "Score batch"}
          </button>
        </div>
      </Panel>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Low" value={counts.low} color="var(--risk-low)" />
            <Stat label="Medium" value={counts.medium} color="var(--risk-med)" />
            <Stat label="High" value={counts.high} color="var(--risk-high)" />
          </div>

          <Panel title={`Results (${results.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">Mode</th>
                    <th className="text-right py-2 pr-3">Weight</th>
                    <th className="text-right py-2 pr-3">Discount</th>
                    <th className="text-right py-2 pr-3">Risk</th>
                    <th className="text-center py-2 pr-3">Band</th>
                    <th className="text-right py-2">Est. delay</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-2 pr-3 text-muted-foreground mono">{i + 1}</td>
                      <td className="py-2 pr-3">{r.input.Mode_of_Shipment}</td>
                      <td className="py-2 pr-3 text-right mono">{r.input.Weight_in_gms}g</td>
                      <td className="py-2 pr-3 text-right mono">{r.input.Discount_offered}%</td>
                      <td className="py-2 pr-3 text-right mono">{(r.pred.risk_score * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3 text-center">
                        <RiskBadge band={r.pred.risk_band} />
                      </td>
                      <td className="py-2 text-right mono">{r.pred.estimated_delay_days}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="panel p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="kpi-num text-3xl font-semibold mt-1.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
