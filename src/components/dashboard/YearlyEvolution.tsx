import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Plane } from "lucide-react";
import { MONTHS } from "@/data/employeeData";

interface KpiRow {
  label: string;
  value: string;
  meta: string;
  color: "blue" | "green" | "red" | "orange";
}

interface VacationPeriod {
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
}

interface YearlyEvolutionProps {
  byMonth: Record<string, { kpis: KpiRow[]; [key: string]: any }>;
  kpiIndexes: number[]; // which KPI indexes to plot on line chart
  colors?: string[];
  selectedMonth: string;
  vacations?: VacationPeriod[];
}

// Try to parse a numeric value from a KPI string (strips %, R$, commas, etc.)
function parseKpiValue(v: string): number | null {
  const clean = v.replace(/[^0-9.,]/g, "").replace(",", "");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function monthHasVacation(monthId: string, vacations: VacationPeriod[]): VacationPeriod | null {
  const [ano, mes] = monthId.split("-").map(Number);
  const monthStart = new Date(ano, mes - 1, 1);
  const monthEnd = new Date(ano, mes, 0);
  return vacations.find((v) => {
    const inicio = new Date(v.data_inicio);
    const fim = new Date(v.data_fim);
    return inicio <= monthEnd && fim >= monthStart;
  }) ?? null;
}

function fmtDateBR(d: string) {
  const [, mes, dia] = d.split("-");
  return `${dia}/${mes}`;
}

const DEFAULT_COLORS = ["#1B7E91", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

const YearlyEvolution = ({ byMonth, kpiIndexes, colors = DEFAULT_COLORS, selectedMonth, vacations = [] }: YearlyEvolutionProps) => {
  // Build timeline from oldest to newest
  const orderedMonths = [...MONTHS].reverse(); // Set 2025 → Feb 2026

  // Gather KPI labels from the first available month
  const firstMonth = Object.values(byMonth)[0];
  const allKpiLabels = firstMonth.kpis.map((k: KpiRow) => k.label);

  // Build chart data series
  const chartData = orderedMonths.map(({ id, label }) => {
    const row: Record<string, string | number> = { month: label };
    kpiIndexes.forEach((idx) => {
      const monthData = byMonth[id];
      if (monthData) {
        const v = parseKpiValue(monthData.kpis[idx]?.value ?? "");
        if (v !== null) row[allKpiLabels[idx]] = v;
      }
    });
    return row;
  });

  // Build summary table (all kpis, all months)
  const tableMonths = orderedMonths;

  return (
    <div className="space-y-6">
      {/* Line chart */}
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Evolução dos KPIs ao Longo do Ano</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {kpiIndexes.map((idx, i) => (
              <Line
                key={allKpiLabels[idx]}
                type="monotone"
                dataKey={allKpiLabels[idx]}
                stroke={colors[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-base font-semibold text-foreground">Resumo Mensal Comparativo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Indicador</th>
                {tableMonths.map(({ id, label }) => {
                  const vacation = monthHasVacation(id, vacations);
                  return (
                    <th
                      key={id}
                      className={`text-center px-3 py-3 font-semibold whitespace-nowrap ${
                        id === selectedMonth ? "text-[#1B7E91] bg-[#1B7E91]/10" : "text-muted-foreground"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {vacation && (
                          <span
                            title={`Férias: ${fmtDateBR(vacation.data_inicio)} a ${fmtDateBR(vacation.data_fim)}${vacation.observacao ? ` · ${vacation.observacao}` : ""}`}
                            className="inline-flex"
                            aria-label="Período de férias"
                          >
                            <Plane className="h-3 w-3 text-info" />
                          </span>
                        )}
                      </span>
                      {id === selectedMonth && (
                        <span className="ml-1 text-[10px] bg-[#1B7E91] text-white rounded px-1 py-0.5">atual</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allKpiLabels.map((label, idx) => (
                <tr key={label} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{label}</td>
                  {tableMonths.map(({ id }) => {
                    const monthData = byMonth[id];
                    const kpi = monthData?.kpis[idx];
                    const colorClass =
                      kpi?.color === "green"
                        ? "text-emerald-600 font-semibold"
                        : kpi?.color === "red"
                        ? "text-red-500 font-semibold"
                        : "text-foreground";
                    return (
                      <td
                        key={id}
                        className={`text-center px-3 py-3 whitespace-nowrap ${colorClass} ${
                          id === selectedMonth ? "bg-[#1B7E91]/5" : ""
                        }`}
                      >
                        {kpi?.value ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YearlyEvolution;
