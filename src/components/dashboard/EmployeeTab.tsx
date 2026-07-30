import { useState } from "react";
import ModernKpiCard, { Tone } from "./ModernKpiCard";
import TrendChart from "./TrendChart";
import PieChartCard from "./PieChartCard";
import GenericBarChart from "./GenericBarChart";
import YearlyEvolution from "./YearlyEvolution";
import { MONTHS } from "@/data/employeeData";
import { Activity, BarChart3, Calendar, ChevronDown, MessageSquare, Phone, Target, TrendingUp } from "lucide-react";

interface AdditionalMetric {
  label: string;
  value: string;
  borderColor: string;
}

interface ChartConfig {
  title: string;
  type: "trend" | "pie" | "bar";
  data: any[];
  color?: string;
  label?: string;
  xKey?: string;
  yKey?: string;
}

interface VacationPeriod {
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
}

interface EmployeeTabProps {
  sectionTitle: string;
  kpis: { label: string; value: string; meta: string; color: "blue" | "green" | "red" | "orange" }[];
  charts: ChartConfig[];
  additionalMetrics: AdditionalMetric[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  byMonth: Record<string, { kpis: { label: string; value: string; meta: string; color: "blue" | "green" | "red" | "orange" }[]; [key: string]: any }>;
  yearlyKpiIndexes: number[];
  yearlyColors?: string[];
  vacations?: VacationPeriod[];
}

const EmployeeTab = ({ sectionTitle, kpis, charts, additionalMetrics, selectedMonth, onMonthChange, byMonth, yearlyKpiIndexes, yearlyColors, vacations }: EmployeeTabProps) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = MONTHS.find(m => m.id === selectedMonth)?.label ?? selectedMonth;
  const tonesByColor: Record<string, Tone> = {
    blue: "info",
    green: "success",
    red: "danger",
    orange: "warning",
  };
  const icons = [Activity, MessageSquare, Target, TrendingUp, Phone, BarChart3];

  return (
    <div className="space-y-8">
      {/* Title + Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">{sectionTitle}</h2>

        {/* Month dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="inline-flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/60 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {selectedLabel}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {MONTHS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { onMonthChange(m.id); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted ${m.id === selectedMonth ? "bg-[#1B7E91]/10 text-[#1B7E91] font-semibold" : "text-foreground"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, index) => (
          <ModernKpiCard
            key={kpi.label}
            {...kpi}
            icon={icons[index % icons.length]}
            tone={tonesByColor[kpi.color] ?? "primary"}
          />
        ))}
      </div>

      {/* Charts */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Análise de Desempenho</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.filter(c => c.type === "trend").map((c) => (
            <TrendChart key={c.title} title={c.title} data={c.data} color={c.color!} label={c.label!} />
          ))}
        </div>
        {charts.filter(c => c.type === "pie").length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {charts.filter(c => c.type === "pie").map((c) => (
              <PieChartCard key={c.title} title={c.title} data={c.data} />
            ))}
          </div>
        )}
        {charts.filter(c => c.type === "bar").length > 0 && (
          <>
            {charts.filter(c => c.type === "bar").some(c => c.title.includes("Conversão") || c.title.includes("Receita")) && (
              <h2 className="text-xl font-semibold text-foreground mb-4 mt-8">Desempenho de Conversão</h2>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {charts.filter(c => c.type === "bar").map((c) => (
                <GenericBarChart
                  key={c.title}
                  title={c.title}
                  data={c.data}
                  xKey={c.xKey || "month"}
                  yKey={c.yKey || "value"}
                  color={c.color!}
                  label={c.label!}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Additional Metrics */}
      {additionalMetrics.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Outras Métricas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {additionalMetrics.map((m) => (
              <div key={m.label} className="glass-card glass-card-hover p-5 border-l-2" style={{ borderLeftColor: m.borderColor }}>
                <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</h3>
                <div className="mt-2 text-3xl font-bold text-foreground">{m.value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Yearly Evolution */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Evolução Anual</h2>
        <YearlyEvolution
          byMonth={byMonth}
          kpiIndexes={yearlyKpiIndexes}
          colors={yearlyColors}
          selectedMonth={selectedMonth}
          vacations={vacations}
        />
      </section>
    </div>
  );
};

export default EmployeeTab;
