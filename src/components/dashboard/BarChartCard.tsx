import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartDataSummary from "./ChartDataSummary";

interface BarChartCardProps {
  title: string;
  data: { month: string; value: number }[];
  color: string;
  label: string;
  /** formata o valor no tooltip, no eixo Y e no resumo (ex.: v => `${v}%`) */
  valueFormatter?: (v: number) => string;
}

function fmt(v: number) {
  if (Math.abs(v) >= 1000) {
    return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return String(v);
}

const BarChartCard = ({ title, data, color, label, valueFormatter }: BarChartCardProps) => (
  <div className="bg-card rounded-lg p-6 shadow-sm min-w-0">
    <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          tickFormatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
          width={valueFormatter ? 64 : undefined}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: 12,
          }}
          formatter={valueFormatter ? (v: number | string) => valueFormatter(Number(v)) : undefined}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
        <Bar dataKey="value" name={label} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    <ChartDataSummary
      items={data.map((d) => ({ name: d.month, value: valueFormatter ? valueFormatter(d.value) : fmt(d.value), color }))}
    />
  </div>
);

export default BarChartCard;
