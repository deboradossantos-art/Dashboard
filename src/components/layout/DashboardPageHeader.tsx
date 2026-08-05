import { Calendar, ChevronDown } from "lucide-react";
import ExportPdfButton from "@/components/dashboard/ExportPdfButton";
import ComparativoButton from "@/components/dashboard/ComparativoButton";

interface MonthOption {
  id: string;
  label: string;
}

interface DashboardPageHeaderProps {
  title: React.ReactNode;
  subtitle?: string;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  monthOpen: boolean;
  setMonthOpen: (fn: (o: boolean) => boolean) => void;
  selectedLabel: string;
  allMonths: MonthOption[];
  reports: { mes: string }[];
  exportTargetId: string;
  exportFileName: string;
  exportTitle: string;
}

/**
 * Cabeçalho compartilhado pelas duas páginas do dashboard (Painel de
 * Operação e Arrecadação, e Indicadores Operacionais Detalhados) — mesmo
 * seletor de mês e botões de exportar/comparar em ambas, só muda o título.
 */
const DashboardPageHeader = ({
  title, subtitle, selectedMonth, setSelectedMonth, monthOpen, setMonthOpen, selectedLabel, allMonths, reports,
  exportTargetId, exportFileName, exportTitle,
}: DashboardPageHeaderProps) => (
  <div className="px-4 sm:px-6 lg:px-10 py-5 flex flex-wrap items-center justify-between gap-4 max-w-[1500px] mx-auto">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle ?? `Período: ${selectedLabel}`}</p>
    </div>
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setMonthOpen((o) => !o)}
          className="inline-flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
        >
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {selectedLabel}</span>
          {selectedMonth === "2026-07" && (
            <span className="text-[0.62rem] font-bold bg-gradient-primary text-primary-foreground px-1.5 py-0.5 rounded">atual</span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${monthOpen ? "rotate-180" : ""}`} />
        </button>
        {monthOpen && (
          <div className="absolute right-0 mt-1 w-44 bg-popover border border-border rounded-lg shadow-card z-50 overflow-hidden">
            {allMonths.map((m) => {
              const temDadosReais = reports.some((r) => r.mes === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMonth(m.id); setMonthOpen(() => false); }}
                  className={`w-full flex items-center justify-between gap-2 text-left px-4 py-2 text-sm transition-colors hover:bg-muted ${m.id === selectedMonth ? "bg-primary/15 text-primary font-semibold" : "text-foreground"}`}
                >
                  <span>{m.label}</span>
                  {temDadosReais && (
                    <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" title="Dados importados" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ComparativoButton />
        <ExportPdfButton
          targetId={exportTargetId}
          fileName={exportFileName}
          title={exportTitle}
        />
      </div>
    </div>
  </div>
);

export default DashboardPageHeader;
