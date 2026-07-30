import { Users2, Target, TrendingUp, Activity, AlertOctagon, ShieldAlert } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import ModernKpiCard from "@/components/dashboard/ModernKpiCard";
import InsightsBar from "@/components/dashboard/InsightsBar";
import EmployeeSummaryCards from "@/components/dashboard/EmployeeSummaryCards";
import PieChartCard from "@/components/dashboard/PieChartCard";
import BarChartCard from "@/components/dashboard/BarChartCard";
import GroupedBarChart from "@/components/dashboard/GroupedBarChart";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";

/**
 * Página secundária ("/indicadores-detalhados"): chatter, CSAT, tempo de
 * resposta, funcionárias, desfalque e receita prevista x real. Era o
 * conteúdo principal do dashboard antes do reskin Lumen — continua existindo,
 * só que separado do painel de entrada, acessível pelo próprio item na
 * barra lateral.
 */
const IndicadoresDetalhados = () => {
  const d = useDashboardOverview();

  const header = (
    <DashboardPageHeader
      title="Indicadores Operacionais Detalhados"
      selectedMonth={d.selectedMonth}
      setSelectedMonth={d.setSelectedMonth}
      monthOpen={d.monthOpen}
      setMonthOpen={d.setMonthOpen}
      selectedLabel={d.selectedLabel}
      allMonths={d.allMonths}
      reports={d.reports}
      exportTargetId="indicadores-detalhados-export"
      exportFileName={`indicadores-detalhados-${d.selectedMonth}.pdf`}
      exportTitle={`Indicadores Operacionais Detalhados - ${d.selectedLabel}`}
    />
  );

  return (
    <AppShell header={header}>
      <div id="indicadores-detalhados-export" className="space-y-8">
        <InsightsBar
          headlineLabel={`Receita de ${d.selectedLabel}`}
          headlineValue={d.headlineRevenue}
          delta={d.dHeadline}
          highlights={[
            { label: "Meta cumprida", value: d.financialYTD ?? `${d.cumprimentoMeta.toFixed(1)}%` },
            { label: "Cadastros ativos", value: d.cadastrosAtivos },
            { label: "Receita prevista", value: d.financialGoal },
            { label: "Volume Chatter", value: (d.volumeAtual ?? 0).toLocaleString("pt-BR") },
            { label: "Comprovantes", value: d.comprovantes },
            { label: "Cora + Stone + Asaas", value: `${d.cora} / ${d.stone} / ${d.asaas}` },
          ]}
          alerts={d.alerts}
        />

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Indicadores principais</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">vs mês anterior</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {d.kpis.map((k) => (
              <ModernKpiCard key={k.label} {...k} loading={d.dataLoading} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Panorama do Relacionamento
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BarChartCard
              title="Evolução da Receita de Relacionamento"
              data={d.chartData.evolucaoReceita}
              color="hsl(var(--primary))"
              label="Receita (R$)"
              valueFormatter={(v) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            />
            <BarChartCard
              title="Taxa de Conversão Financeira"
              data={d.chartData.conversaoFinanceira.map((c) => ({ month: c.name, value: c.value }))}
              color="hsl(var(--primary))"
              label="Conversão (%)"
              valueFormatter={(v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <EmployeeSummaryCards summaries={d.employeeSummaries} period={d.selectedLabel} />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card glass-card-hover p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider"><Users2 className="h-3.5 w-3.5" />Cadastros Ativos</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{d.cadastrosAtivos}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Base ativa de relacionamento</div>
            </div>
            <div className="glass-card glass-card-hover p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider"><Target className="h-3.5 w-3.5" />Receita Prevista</div>
              <div className="mt-2 text-3xl font-bold text-foreground">{d.financialGoal}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Meta mensal</div>
            </div>
            <div className="glass-card glass-card-hover p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-success/20 blur-3xl" />
              <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider"><TrendingUp className="h-3.5 w-3.5" />Receita Real</div>
              <div className="mt-2 text-3xl font-bold text-success">{d.financialYTDValue}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{d.selectedLabel}</div>
            </div>

            <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="glass-card p-4 border-l-2 border-l-primary/70">
                <div className="text-[10px] font-semibold text-primary uppercase tracking-wider">Comprovantes</div>
                <div className="text-xl font-bold text-foreground mt-1">{d.comprovantes}</div>
              </div>
              <div className="glass-card p-4 border-l-2 border-l-success/70">
                <div className="text-[10px] font-semibold text-success uppercase tracking-wider">Cora</div>
                <div className="text-xl font-bold text-foreground mt-1">{d.cora}</div>
              </div>
              <div className="glass-card p-4 border-l-2 border-l-warning/70">
                <div className="text-[10px] font-semibold text-warning uppercase tracking-wider">Stone</div>
                <div className="text-xl font-bold text-foreground mt-1">{d.stone}</div>
              </div>
              <div className="glass-card p-4 border-l-2 border-l-info/70">
                <div className="text-[10px] font-semibold text-info uppercase tracking-wider">Asaas</div>
                <div className="text-xl font-bold text-foreground mt-1">{d.asaas}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <GroupedBarChart
            title="Receita Prevista x Real"
            data={d.chartData.receitaPrevReal}
            xKey="month"
            series={[
              { key: "prevista", label: "Receita Prevista (R$)", color: "hsl(var(--primary))" },
              { key: "real", label: "Receita Real (R$)", color: "hsl(var(--success))" },
            ]}
            valueFormatter={(v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <PieChartCard title="Onde está o desfalque?" data={d.desfalqueData} />
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Outras Métricas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModernKpiCard label="Cancelamentos no Período" value={d.displayCancelamentos} icon={AlertOctagon} tone="info" />
            <ModernKpiCard label="Taxa de Inadimplência" value={d.displayInadimplencia} icon={ShieldAlert} tone="warning" />
            <ModernKpiCard label="ROI da Retenção (Atual)" value={d.displayRoiAtual} icon={TrendingUp} tone="success" />
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default IndicadoresDetalhados;
