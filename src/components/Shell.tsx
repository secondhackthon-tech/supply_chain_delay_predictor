import { Link, useLocation } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  FileBarChart,
  FlaskConical,
  Gauge,
  Lightbulb,
  Microscope,
  Settings2,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { getApiBase, setApiBase, api } from "@/lib/api";

const NAV = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/predict", label: "Predict", icon: Truck },
  { to: "/batch", label: "Batch", icon: Boxes },
  { to: "/simulate", label: "Simulate", icon: FlaskConical },
  { to: "/explain", label: "Explainability", icon: Microscope },
  { to: "/monitor", label: "Monitoring", icon: Activity },
  { to: "/recommendations", label: "Playbook", icon: Lightbulb },
  { to: "/analytics", label: "Analytics", icon: FileBarChart },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [apiUrl, setApiUrl] = useState(getApiBase());
  const [health, setHealth] = useState<{ status: string; model_version: string } | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((h) => !cancelled && setHealth(h))
      .catch(() => !cancelled && setHealth(null));
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card/40 backdrop-blur-sm flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-primary/15 grid place-items-center panel-glow">
              <Truck className="size-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">ARGO</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Logistics Risk
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`size-2 rounded-full ${
                health?.status === "ok"
                  ? "bg-[var(--risk-low)]"
                  : health?.status === "model_missing"
                    ? "bg-[var(--risk-med)]"
                    : "bg-[var(--risk-high)]"
              }`}
            />
            <span className="text-muted-foreground">
              {health?.status === "ok"
                ? "API live"
                : health?.status === "model_missing"
                  ? "Model missing"
                  : "API unreachable"}
            </span>
          </div>
          {health?.model_version && (
            <div className="text-[10px] text-muted-foreground mono">
              v{health.model_version}
            </div>
          )}
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setApiBase(apiUrl);
                setEditing(false);
                window.location.reload();
              }}
              className="space-y-1"
            >
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-input border border-border mono"
                placeholder="https://your-api.onrender.com"
              />
              <button type="submit" className="w-full text-xs py-1.5 rounded bg-primary text-primary-foreground font-medium">
                Save & reload
              </button>
            </form>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground mono truncate"
              title={apiUrl}
            >
              <Settings2 className="size-3" />
              <span className="truncate">{apiUrl.replace(/^https?:\/\//, "")}</span>
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
