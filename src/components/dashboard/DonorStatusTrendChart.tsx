import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartDataSummary from "./ChartDataSummary";

export interface DonorStatusPoint {
  month: string;
  novosAtivos: number | null;
  churn: number | null;
}

interface DonorStatusTrendChartProps {
  title: string;
  subtitle?: string;
  data: DonorStatusPoint[];
}

// Paleta navy + dourado, valores HSL fixos (não var(--primary)) pra não
// inverter no modo escuro.
const NAVY = "hsl(217 89% 14%)";
const GOLD = "hsl(46 76% 57%)";

const numFmt = (v: number) => (Number.isFinite(v) ? v.toLocaleString("pt-BR", { signDisplay: "exceptZero" }) : "—");

/**
 * Conceito original do PDF, revertido a pedido de Débora: eixo duplo com
 * "Novos Ativos" (variação mês a mês de Doadores Ativos, em quantidade — eixo
 * esquerdo) e "Churn" (Pct Cancelados do mês — eixo direito, sem símbolo de %
 * pra bater com o estilo da referência).
 */
const DonorStatusTrendChart = ({ title, subtitle, data }: DonorStatusTrendChartProps) => {
  const hasData = data.some((d) => d.novosAtivos !== null || d.churn !== null);

  // Limite simétrico calculado aqui mesmo (não como função de domain do
  // Recharts — o Recharts chama a função do mínimo só com o dataMin e a do
  // máximo só com o dataMax, cada uma sem acesso à outra, então não dá pra
  // espelhar os dois lados só com isso). Assim o 0 sempre cai no centro.
  const maxAbsNovosAtivos = Math.max(1, ...data.map((d) => (d.novosAtivos !== null ? Math.abs(d.novosAtivos) : 0)));

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm min-w-0">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-2">{subtitle}</p>}

      {!hasData ? (
        <div className="h-[260px] grid place-items-center text-center px-6">
          <p className="text-sm text-muted-foreground">
            Aguardando dados — precisa de pelo menos 2 meses em <code className="text-foreground">strategic_kpi_reports</code> (Doadores
            Ativos) e de <code className="text-foreground">donor_status_reports</code> (Pct Cancelados) no Supabase.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              domain={[-maxAbsNovosAtivos, maxAbsNovosAtivos]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              label={{ value: "Novos Ativos", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              label={{ value: "Churn", angle: 90, position: "insideRight", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number) => numFmt(v)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
            <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="novosAtivos"
              name="Novos Ativos"
              stroke={NAVY}
              strokeWidth={3}
              dot={{ r: 5, fill: NAVY, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: NAVY, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="churn"
              name="Churn"
              stroke={GOLD}
              strokeWidth={3}
              dot={{ r: 5, fill: GOLD, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: GOLD, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {hasData && (
        <ChartDataSummary
          items={data.flatMap((d) => [
            { name: `${d.month} — Novos Ativos`, value: d.novosAtivos !== null ? numFmt(d.novosAtivos) : "—", color: NAVY },
            { name: `${d.month} — Churn`, value: d.churn !== null ? numFmt(d.churn) : "—", color: GOLD },
          ])}
        />
      )}
    </div>
  );
};

export default DonorStatusTrendChart;
