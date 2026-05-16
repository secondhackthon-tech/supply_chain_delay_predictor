import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PackageCheck,
  Plane,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { PageHeader, Panel } from "@/components/ui-bits";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Intervention playbook — ARGO" },
      {
        name: "description",
        content:
          "Operational playbook the model recommends for each risk band, with the why behind each action.",
      },
    ],
  }),
  component: RecPage,
});

const BANDS = [
  {
    band: "HIGH",
    color: "var(--risk-high)",
    summary: "Risk ≥ 70%. Treat as actively at risk of breaching SLA.",
    actions: [
      { icon: Plane, title: "Upgrade to Flight mode", body: "Cuts transit time and the dominant Ship-mode penalty in the model." },
      { icon: ShieldCheck, title: "Add insurance + priority handling", body: "Limits downside if delay still occurs; covers high-value SKUs." },
      { icon: PhoneCall, title: "Proactive customer outreach", body: "Notify before the customer notices. NPS-positive even on real delays." },
      { icon: PackageCheck, title: "Assign a priority handler", body: "Ensures the carton ships in the next outbound wave, not the next bin." },
    ],
  },
  {
    band: "MEDIUM",
    color: "var(--risk-med)",
    summary: "Risk 40–70%. Intervene where cheap, monitor otherwise.",
    actions: [
      { icon: TrendingUp, title: "Bump warehouse priority", body: "Move from standard to expedited pick queue at near-zero cost." },
      { icon: Plane, title: "Consider faster mode", body: "Switch from Road→Ship or Ship→Flight when margin allows." },
      { icon: PhoneCall, title: "Tag for proactive contact", body: "Customer success watches these and reaches out only on confirmed slip." },
    ],
  },
  {
    band: "LOW",
    color: "var(--risk-low)",
    summary: "Risk < 40%. Ship normally; reserve attention for higher-risk lanes.",
    actions: [
      { icon: CheckCircle2, title: "Standard dispatch", body: "No intervention required. Capture as a positive label in the next training run." },
    ],
  },
] as const;

const SIGNALS = [
  "Heavier shipments via Ship mode are the strongest delay predictor.",
  "Discount-heavy orders correlate with delay (likely larger volumes / lower-priority handling).",
  "More prior purchases and more customer-care calls both reduce predicted risk.",
  "Mode of shipment is the single most impactful actionable lever.",
];

function RecPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Intervention playbook"
        description="What ops should actually do, broken out by risk band. Each action maps to a model signal so the team understands the why."
        actions={
          <Link
            to="/simulate"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Lightbulb className="size-4" /> Test an intervention
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {BANDS.map((b) => (
          <Panel
            key={b.band}
            title={
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: b.color }} />
                {b.band} band
              </span>
            }
            subtitle={b.summary}
          >
            <ul className="space-y-3">
              {b.actions.map((a) => (
                <li key={a.title} className="flex gap-3">
                  <div
                    className="size-8 shrink-0 rounded-md grid place-items-center"
                    style={{ background: `color-mix(in oklab, ${b.color} 18%, transparent)`, color: b.color }}
                  >
                    <a.icon className="size-4" />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{a.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Panel
        title="Model signals → ops levers"
        subtitle="What the model has learned that the team can act on."
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {SIGNALS.map((s) => (
            <li key={s} className="flex items-start gap-2.5 panel p-3 bg-muted/20">
              <AlertTriangle className="size-4 text-[var(--risk-med)] mt-0.5 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
