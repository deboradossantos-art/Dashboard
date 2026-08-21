import { Landmark, UserCheck, CreditCard, ClipboardCheck } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import PrimaryKpiCard from "@/components/dashboard/PrimaryKpiCard";
import LumenFilterBar from "@/components/dashboard/LumenFilterBar";
import DonorStatusTrendChart from "@/components/dashboard/DonorStatusTrendChart";
import GroupedBarChart from "@/components/dashboard/GroupedBarChart";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import { CANAL_GRUPOS, MODALIDADES, fmtBRLOrDash, fmtPctOrDash } from "@/data/strategicData";

/**
 * Página principal do dashboard ("/"): Painel de Operação e Arrecadação.
 * Os indicadores operacionais antigos (chatter, CSAT, funcionárias, desfalque
 * etc.) moraram aqui antes — agora vivem em /indicadores-detalhados, acessível
 * pelo item próprio na barra lateral.
 */
const Index = () => {
  const d = useDashboardOverview();

  const header = (
    <DashboardPageHeader
      title={<>Painel de Operação e <span className="text-gradient-primary">Arrecadação</span></>}
      selectedMonth={d.selectedMonth}
      setSelectedMonth={d.setSelectedMonth}
      monthOpen={d.monthOpen}
      setMonthOpen={d.setMonthOpen}
      selectedLabel={d.selectedLabel}
      allMonths={d.allMonths}
      reports={d.reports}
      exportTargetId="painel-operacao-export"
      exportFileName={`painel-operacao-${d.selectedMonth}.pdf`}
      exportTitle={`Painel de Operação e Arrecadação - ${d.selectedLabel}`}
    />
  );

  return (
    <AppShell header={header}>
      <div id="painel-operacao-export" className="space-y-6">
        <LumenFilterBar
          responsavel={d.user?.email ?? "Coordenação Ser Feliz"}
          periodoLabel={d.selectedLabel}
          canalGrupos={CANAL_GRUPOS}
          canalSelecionado={d.canalFiltro}
          onCanalChange={d.setCanalFiltro}
          modalidades={MODALIDADES}
          modalidadeSelecionada={d.modalidadeFiltro}
          onModalidadeChange={d.setModalidadeFiltro}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <PrimaryKpiCard
            label="Arrecadação Ativa Total (R$)"
            value={fmtBRLOrDash(d.arrecadacaoAtiva)}
            icon={Landmark}
            delta={d.deltaArrecadacao}
            higherIsBetter
          />
          <PrimaryKpiCard
            label="Taxa de Migração de Inativos para Ativos (%)"
            value={fmtPctOrDash(d.taxaAtivacao)}
            icon={UserCheck}
          />
          <PrimaryKpiCard
            label="Taxa de Fidelização no Cartão (%)"
            value={fmtPctOrDash(d.taxaRecorrenciaCartao)}
            icon={CreditCard}
          />
          <PrimaryKpiCard
            label="Índice de Conciliação (%)"
            value={fmtPctOrDash(d.indiceConciliacao)}
            icon={ClipboardCheck}
            metaLabel="Meta: >95%"
            metaAchieved={d.conciliacaoAtingida}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {d.temDadosCanalModalidade ? (
            <GroupedBarChart
              title="Métodos por Segmento (barras lado a lado)"
              data={d.groupedBarData}
              xKey="canal"
              series={d.groupedBarSeries}
            />
          ) : (
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground">Métodos por Segmento (barras lado a lado)</h3>
              <div className="h-[260px] grid place-items-center text-center px-6">
                <p className="text-sm text-muted-foreground">
                  Aguardando dados — crie a tabela <code className="text-foreground">channel_modality_reports</code> no Supabase.
                </p>
              </div>
            </div>
          )}
          <DonorStatusTrendChart
            title="Variação de Doadores Ativos vs. Churn"
            subtitle="Variação de Doadores Ativos = diferença na quantidade de doadores ativos entre o mês atual e o mês anterior. Churn = percentual de doadores ativos no início do período que cancelaram ou deixaram de responder após 5 tentativas de contato."
            data={d.donorStatusChartData}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
