import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartDataSummary from "./ChartDataSummary";
import ChartEmptyState from "./ChartEmptyState";

interface Series {
  key: string;
  label: string;
  color: string;
}

interface GroupedBarChartProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  /** formata valores (ex.: BRL). Default: separador pt-BR */
  valueFormatter?: (v: number) => string;
}

const defaultFmt = (v: number) => {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
};

const GroupedBarChart = ({ title, data, xKey, series, valueFormatter = defaultFmt }: GroupedBarChartProps) => {
  const [showAll, setShowAll] = useState(false);

  // Por padrão, esconde categorias sem nenhum valor (todas as séries em 0) —
  // evita que o gráfico fique enorme com um monte de canais vazios. Um botão
  // deixa expandir e ver todos, inclusive os zerados.
  const hasAnyValue = (row: Record<string, string | number>) => series.some((s) => Number(row[s.key]) > 0);
  const visibleData = useMemo(
    () => (showAll ? data : data.filter(hasAnyValue)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, series, showAll]
  );
  const hiddenCount = data.length - data.filter(hasAnyValue).length;

  // Legenda textual: uma linha por mês com todos os valores
  const summaryItems = visibleData.flatMap((row) =>
    series.map((s) => ({
      name: `${row[xKey]} — ${s.label}`,
      value: valueFormatter(Number(row[s.key])),
      color: s.color,
    }))
  );

  // Altura cresce com o número de categorias x séries, pra barras horizontais
  // não ficarem espremidas.
  const rowCount = Math.max(1, visibleData.length);
  const chartHeight = Math.max(180, rowCount * series.length * 34 + 60);

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {showAll ? (
              <>Ocultar sem movimento <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>+{hiddenCount} canal(is) sem movimento <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={visibleData} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }}
                tickFormatter={(v) => (typeof v === "number" && Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <YAxis
                dataKey={xKey}
                type="category"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 14, fontWeight: 600 }}
                width={110}
              />
              <Tooltip
                formatter={(v: number | string) => valueFormatter(Number(v))}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[0, 4, 4, 0]} barSize={22}>
                  <LabelList
                    dataKey={s.key}
                    position="right"
                    formatter={(v: number) => (v ? valueFormatter(Number(v)) : "")}
                    style={{ fill: "hsl(var(--foreground))", fontSize: 13, fontWeight: 600 }}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <ChartDataSummary items={summaryItems} />
        </>
      )}
    </div>
  );
};

export default GroupedBarChart;
