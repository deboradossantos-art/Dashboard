import { FunnelChart, Funnel, Cell, LabelList, Tooltip, ResponsiveContainer } from "recharts";
import ChartDataSummary from "./ChartDataSummary";

export interface FunnelStage {
  name: string;
  value: number | null;
}

interface DonorFunnelChartProps {
  title: string;
  subtitle?: string;
  stages: FunnelStage[];
}

// Valores HSL fixos (não var(--primary)/var(--gold)) — essas variáveis
// invertem no modo escuro e fariam o degradê perder o sentido.
const STAGE_COLORS = [
  "hsl(217 89% 14%)",
  "217 70% 28%",
  "217 55% 42%",
  "46 60% 55%",
  "hsl(46 76% 57%)",
];

/**
 * Proposta alternativa ao funil "Conversão de Cadastros" original (marcado
 * como "pensar em outra proposta" no PDF). Em vez de parar em "Primeiro
 * Pagamento", a jornada vai até "Doador Ativo (Recorrente)" — a mesma
 * definição usada na Taxa de Ativação Geral — para que o funil e o cartão de
 * KPI contem a mesma história, do cadastro até a ativação real.
 */
const DonorFunnelChart = ({ title, subtitle, stages }: DonorFunnelChartProps) => {
  const hasData = stages.some((s) => s.value !== null && s.value! > 0);
  const first = stages[0]?.value ?? null;

  const data = stages.map((s, i) => ({
    name: s.name,
    value: s.value ?? 0,
    fill: STAGE_COLORS[i % STAGE_COLORS.length].startsWith("hsl") ? STAGE_COLORS[i % STAGE_COLORS.length] : `hsl(${STAGE_COLORS[i % STAGE_COLORS.length]})`,
    pct: first && s.value !== null ? (s.value / first) * 100 : null,
  }));

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm min-w-0">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{subtitle}</p>}

      {!hasData ? (
        <div className="h-[260px] grid place-items-center text-center px-6">
          <p className="text-sm text-muted-foreground">
            Aguardando dados — crie a tabela <code className="text-foreground">donor_funnel_reports</code> no
            Supabase para preencher este funil.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <FunnelChart>
            <Tooltip
              formatter={(v: number, _n, p: any) => [`${v.toLocaleString("pt-BR")} (${p?.payload?.pct?.toFixed(1) ?? "—"}%)`, p?.payload?.name]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
            />
            <Funnel dataKey="value" data={data} isAnimationActive>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <LabelList position="right" dataKey="name" fill="hsl(var(--foreground))" fontSize={12} />
              <LabelList
                position="center"
                dataKey="value"
                fill="#fff"
                fontSize={13}
                fontWeight={400}
                formatter={(v: number) => v.toLocaleString("pt-BR")}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      )}

      {hasData && (
        <ChartDataSummary
          items={data.map((d) => ({
            name: d.name,
            value: `${d.value.toLocaleString("pt-BR")}${d.pct !== null ? ` (${d.pct.toFixed(1)}%)` : ""}`,
            color: d.fill,
          }))}
        />
      )}
    </div>
  );
};

export default DonorFunnelChart;
