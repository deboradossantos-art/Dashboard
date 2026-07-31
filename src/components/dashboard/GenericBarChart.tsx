import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartDataSummary from "./ChartDataSummary";
import ChartEmptyState from "./ChartEmptyState";

interface GenericBarChartProps {
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color: string;
  label: string;
}

function fmt(v: number | string) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000) return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(n);
}

const GenericBarChart = ({ title, data, xKey, yKey, color, label }: GenericBarChartProps) => (
  <div className="bg-card rounded-lg p-6 shadow-sm">
    <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
    {data.length === 0 ? (
      <ChartEmptyState />
    ) : (
      <>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
            <Bar dataKey={yKey} name={label} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <ChartDataSummary
          items={data.map((d) => ({ name: String(d[xKey]), value: fmt(d[yKey]), color }))}
        />
      </>
    )}
  </div>
);

export default GenericBarChart;
