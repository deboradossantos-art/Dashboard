import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useAnimatedValue } from "@/lib/useAnimatedValue";

export type Tone = "primary" | "success" | "warning" | "danger" | "info";

interface ModernKpiCardProps {
  label: string;
  value: string;
  meta?: string;
  icon: LucideIcon;
  tone?: Tone;
  /** percentage delta vs prev period (e.g. -12.3 means -12.3%) */
  delta?: number | null;
  /** higher value is better (used to color the delta) */
  higherIsBetter?: boolean;
  sparkline?: number[];
  /** when true, shows a skeleton placeholder instead of the value */
  loading?: boolean;
}

const toneConfig: Record<Tone, { ring: string; iconBg: string; iconColor: string; sparkColor: string }> = {
  primary: { ring: "from-primary/30 to-primary/0", iconBg: "bg-primary/15", iconColor: "text-primary", sparkColor: "hsl(var(--primary))" },
  success: { ring: "from-success/30 to-success/0", iconBg: "bg-success/15", iconColor: "text-success", sparkColor: "hsl(var(--success))" },
  warning: { ring: "from-warning/30 to-warning/0", iconBg: "bg-warning/15", iconColor: "text-warning", sparkColor: "hsl(var(--warning))" },
  danger:  { ring: "from-destructive/30 to-destructive/0", iconBg: "bg-destructive/15", iconColor: "text-destructive", sparkColor: "hsl(var(--destructive))" },
  info:    { ring: "from-info/30 to-info/0", iconBg: "bg-info/15", iconColor: "text-info", sparkColor: "hsl(var(--info))" },
};

const ModernKpiCard = ({
  label, value, meta, icon: Icon, tone = "primary", delta = null, higherIsBetter = true, sparkline, loading = false,
}: ModernKpiCardProps) => {
  const t = toneConfig[tone];
  const hasDelta = delta !== null && Number.isFinite(delta);
  const positive = hasDelta ? (higherIsBetter ? delta! >= 0 : delta! <= 0) : null;
  const DeltaIcon = !hasDelta ? Minus : delta! > 0 ? TrendingUp : delta! < 0 ? TrendingDown : Minus;

  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }));
  const animatedValue = useAnimatedValue(value);

  if (loading) {
    return (
      <div className="glass-card relative overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
            <div className="h-8 w-32 rounded bg-muted/60 animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-muted/40 animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted/50 animate-pulse shrink-0" />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="h-6 w-28 rounded-md bg-muted/40 animate-pulse" />
          <div className="h-10 w-24 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "glass-card glass-card-hover relative overflow-hidden p-5 group animate-scale-in"
    )}>
      {/* subtle gradient ring */}
      <div className={cn("absolute inset-x-0 -top-px h-px bg-gradient-to-r opacity-70", t.ring)} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold text-foreground leading-none tracking-tight">
            {animatedValue}
          </div>
          {meta && <div className="mt-2 text-[11px] text-muted-foreground/80 line-clamp-2">{meta}</div>}
        </div>
        <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", t.iconBg)}>
          <Icon className={cn("h-5 w-5", t.iconColor)} />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        {hasDelta ? (
          <div className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
            positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          )}>
            <DeltaIcon className="h-3 w-3" />
            {delta! > 0 ? "+" : ""}{delta!.toFixed(1)}% vs mês anterior
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
            <Minus className="h-3 w-3" /> sem comparativo
          </div>
        )}

        {sparkData.length > 1 && (
          <div className="h-10 w-24 -mb-1 opacity-90">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id={`spark-${tone}-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.sparkColor} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={t.sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={t.sparkColor} strokeWidth={2} fill={`url(#spark-${tone}-${label})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernKpiCard;
