import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertLevel = "success" | "warning" | "danger" | "info";

export interface DashboardAlert {
  level: AlertLevel;
  title: string;
  description: string;
}

interface InsightsBarProps {
  /** big headline KPI like "R$ 51.233,16" */
  headlineValue: string;
  headlineLabel: string;
  /** delta % vs previous period */
  delta: number | null;
  highlights: { label: string; value: string }[];
  alerts: DashboardAlert[];
}

const levelConfig: Record<AlertLevel, { icon: typeof Info; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-success/30" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  danger:  { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
  info:    { icon: Info, color: "text-info", bg: "bg-info/10", border: "border-info/30" },
};

const InsightsBar = ({ headlineValue, headlineLabel, delta, highlights, alerts }: InsightsBarProps) => {
  const positive = delta !== null && delta >= 0;
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
      {/* Executive headline */}
      <div className="glass-card relative overflow-hidden p-6 lg:col-span-2">
        <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-slow" />
            Resumo executivo
          </div>
          <h3 className="mt-2 text-sm text-muted-foreground">{headlineLabel}</h3>
          <div className="mt-1 flex items-end gap-3 flex-wrap">
            <div className="text-4xl sm:text-5xl font-bold text-gradient-primary leading-none tracking-tight">
              {headlineValue}
            </div>
            {delta !== null && (
              <div className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
                positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              )}>
                {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs mês anterior
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {highlights.map((h) => (
              <div key={h.label} className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.label}</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">{h.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Alertas inteligentes</div>
          <span className="text-[10px] font-semibold rounded-full bg-primary/15 text-primary px-2 py-0.5">{alerts.length}</span>
        </div>
        <ul className="space-y-2.5 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
          {alerts.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhum alerta no momento.</li>
          )}
          {alerts.map((a, i) => {
            const c = levelConfig[a.level];
            const Icon = c.icon;
            return (
              <li key={i} className={cn("flex gap-3 rounded-lg border px-3 py-2.5", c.bg, c.border)}>
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", c.color)} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.description}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default InsightsBar;
