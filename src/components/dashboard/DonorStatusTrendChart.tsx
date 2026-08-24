import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartDataSummary from "./ChartDataSummary";

export interface DonorStatusPoint {
  month: string;
  variacaoAtivos: number | null;
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
 * Eixo duplo: "Variação de Doadores Ativos" (ativos do mês - ativos do mês
 * anterior, em quantidade — eixo esquerdo) e "Churn" (Pct Cancelados do mês —
 * eixo direito, em %). Não é "Novos Doadores": não temos coluna de doadores
 * efetivamente adquiridos no mês, só o total de ativos por mês, então a série
 * é a diferença entre os totais (Ativos atuais = Ativos anteriores + Novos
 * Doadores - Cancelamentos ⇒ essa diferença já é líquida das duas coisas).
 */
const DonorStatusTrendChart = ({ title, subtitle, data }: DonorStatusTrendChartProps) => {
  const hasData = data.some((d) => d.variacaoAtivos !== null || d.churn !== null);

  // Corta os meses iniciais sem nenhum dos dois valores: mostrá-los só
  // deixa o trecho com dado real espremido num canto do gráfico.
  const firstIdx = data.findIndex((d) => d.variacaoAtivos !== null || d.churn !== null);
  const chartData = firstIdx === -1 ? data : data.slice(firstIdx);

  // Limite simétrico calculado aqui mesmo (não como função de domain do
  // Recharts — o Recharts chama a função do mínimo só com o dataMin e a do
  // máximo só com o dataMax, cada uma sem acesso à outra, então não dá pra
  // espelhar os dois lados só com isso). Assim o 0 sempre cai no centro.
  const maxAbsVariacaoAtivos = Math.max(1, ...chartData.map((d) => (d.variacaoAtivos !== null ? Math.abs(d.variacaoAtivos) : 0)));
  // Churn é sempre >= 0 (% de cancelados), então o eixo direito não deve
  // ser simétrico em torno do zero — isso desperdiçava metade da escala e
  // fazia a linha do Churn parecer flutuar sem relação clara com o eixo.
  // Uma folga de 20% no topo evita que o ponto mais alto encoste na borda.
  const maxChurn = Math.max(1, ...chartData.map((d) => (d.churn !== null ? d.churn : 0)));
  const churnDomainMax = Math.ceil(maxChurn * 1.2);

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
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              domain={[-maxAbsVariacaoAtivos, maxAbsVariacaoAtivos]}
              tick={{ fill: NAVY, fontSize: 11 }}
              label={{ value: "Variação de Ativos (nº)", angle: -90, position: "insideLeft", fill: NAVY, fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, churnDomainMax]}
              tick={{ fill: GOLD, fontSize: 11 }}
              label={{ value: "Churn (%)", angle: 90, position: "insideRight", fill: GOLD, fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number, name: string) => [name === "Churn (%)" ? `${numFmt(v)}%` : numFmt(v), name]}
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
              dataKey="variacaoAtivos"
              name="Variação de Doadores Ativos"
              stroke={NAVY}
              strokeWidth={3}
              dot={{ r: 5, fill: NAVY, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: NAVY, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              label={{ position: "top", fontSize: 11, fill: NAVY, formatter: (v: number) => numFmt(v) }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="churn"
              name="Churn (%)"
              stroke={GOLD}
              strokeWidth={3}
              dot={{ r: 5, fill: GOLD, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: GOLD, stroke: "hsl(var(--card))", strokeWidth: 2 }}
              label={{ position: "bottom", fontSize: 11, fill: GOLD, formatter: (v: number) => `${numFmt(v)}%` }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {hasData && (
        <ChartDataSummary
          items={data.flatMap((d) => [
            { name: `${d.month} — Variação de Doadores Ativos`, value: d.variacaoAtivos !== null ? numFmt(d.variacaoAtivos) : "—", color: NAVY },
            { name: `${d.month} — Churn (%)`, value: d.churn !== null ? numFmt(d.churn) : "—", color: GOLD },
          ])}
        />
      )}
    </div>
  );
};

export default DonorStatusTrendChart;
