import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartDataSummary from "./ChartDataSummary";
import ChartEmptyState from "./ChartEmptyState";

interface TrendChartProps {
  title: string;
  data: { day: number; value: number }[];
  color: string;
  label: string;
}

function fmt(v: number) {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(v);
}

const TrendChart = ({ title, data, color, label }: TrendChartProps) => {
  const values = data.map((d) => d.value).filter((v) => Number.isFinite(v));
  const total = values.reduce((s, v) => s + v, 0);
  const avg = values.length > 0 ? total / values.length : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm min-w-0">
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      {data.length === 0 ? (
        <ChartEmptyState />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
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
              <Area type="monotone" dataKey="value" name={label} stroke={color} fill={color} fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
          <ChartDataSummary
            items={[
              { name: "Total", value: fmt(total), color },
              { name: "Média", value: fmt(Number(avg.toFixed(2))), color },
              { name: "Máx", value: fmt(max), color },
              { name: "Mín", value: fmt(min), color },
            ]}
          />
        </>
      )}
    </div>
  );
};

export default TrendChart;
