import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "low" | "med" | "high";
}) {
  const colorMap = {
    default: "text-foreground",
    low: "text-[var(--risk-low)]",
    med: "text-[var(--risk-med)]",
    high: "text-[var(--risk-high)]",
  } as const;
  return (
    <div className="panel p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`kpi-num text-3xl font-semibold mt-1.5 ${colorMap[tone]}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1.5">{hint}</div>}
    </div>
  );
}

export function RiskBadge({ band }: { band: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-[var(--risk-low)]/15 text-[var(--risk-low)] border-[var(--risk-low)]/30",
    medium: "bg-[var(--risk-med)]/15 text-[var(--risk-med)] border-[var(--risk-med)]/30",
    high: "bg-[var(--risk-high)]/15 text-[var(--risk-high)] border-[var(--risk-high)]/30",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${map[band]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {band}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
