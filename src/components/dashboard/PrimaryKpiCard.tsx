import { LucideIcon, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrimaryKpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** percentage delta vs previous period (e.g. -12.3 means -12.3%). Omit to hide the badge entirely. */
  delta?: number | null;
  higherIsBetter?: boolean;
  /** meta textual, ex.: "Meta: >95%" */
  metaLabel?: string;
  /** quando a meta foi atingida, mostra o selo verde de check (como no card de Conciliação) */
  metaAchieved?: boolean;
  loading?: boolean;
}

/**
 * Cartão no padrão visual do painel Lumen: fundo branco, faixa dourada no
 * topo, ícone circular navy, número em destaque. Sem sparkline — a versão
 * anterior tinha uma linha verde/vermelha decorativa no rodapé do card de
 * Arrecadação que foi removida a pedido (ver anotação em vermelho no PDF).
 */
const PrimaryKpiCard = ({
  label, value, icon: Icon, delta = undefined, higherIsBetter = true, metaLabel, metaAchieved, loading = false,
}: PrimaryKpiCardProps) => {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const positive = hasDelta ? (higherIsBetter ? delta! >= 0 : delta! <= 0) : null;
  const DeltaIcon = !hasDelta ? Minus : delta! > 0 ? TrendingUp : delta! < 0 ? TrendingDown : Minus;

  if (loading) {
    return (
      <div className="lumen-card p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-muted/60 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
            <div className="h-8 w-28 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lumen-card p-5 flex flex-col items-center text-center gap-2">
      <div className="lumen-icon-circle h-11 w-11 rounded-full grid place-items-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>

      {metaLabel && (
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {metaAchieved && <CheckCircle2 className="h-3 w-3 text-success" />}
          {metaLabel}
        </div>
      )}

      <div className="text-3xl font-bold text-foreground leading-none tracking-tight">{value}</div>

      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>

      {hasDelta && (
        <div className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold mt-1",
          positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        )}>
          <DeltaIcon className="h-3 w-3" />
          {delta! > 0 ? "+" : ""}{delta!.toFixed(1)}% vs mês anterior
        </div>
      )}

      {metaAchieved !== undefined && !metaAchieved && metaLabel && (
        <div className="h-1 w-full rounded-full bg-muted mt-1 overflow-hidden">
          <div className="h-full bg-warning" style={{ width: "60%" }} />
        </div>
      )}
    </div>
  );
};

export default PrimaryKpiCard;
