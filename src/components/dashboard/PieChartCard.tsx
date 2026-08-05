import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartDataSummary from "./ChartDataSummary";
import ChartEmptyState from "./ChartEmptyState";

interface PieChartCardProps {
  title: string;
  data: { name: string; value: number; fill: string }[];
}

function fmt(v: number) {
  if (Math.abs(v) >= 1000) return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(v);
}

const PieChartCard = ({ title, data }: PieChartCardProps) => {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm min-w-0">
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      {data.length === 0 ? (
        <ChartEmptyState height={300} />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span className="text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <ChartDataSummary
            items={data.map((d) => {
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1).replace(".", ",") + "%" : "—";
              return { name: d.name, value: `${fmt(d.value)} (${pct})`, color: d.fill };
            })}
          />
        </>
      )}
    </div>
  );
};

export default PieChartCard;
