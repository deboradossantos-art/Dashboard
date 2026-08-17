import { useMemo, useState, useEffect, useRef } from "react";
import { Clock, MessageSquare, Smile, Wallet } from "lucide-react";
import type { Tone } from "@/components/dashboard/ModernKpiCard";
import type { DashboardAlert } from "@/components/dashboard/InsightsBar";
import type { EmployeeSummary } from "@/components/dashboard/EmployeeSummaryCards";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/PasswordGate";

import { MONTHS } from "@/data/employeeData";
import {
  geralByMonth,
  kpiCards as defaultKpiCards,
} from "@/data/dashboardData";
import {
  StrategicKpiReport, ChannelModalityReport, DonorStatusReport, DonorFunnelReport,
  calcTaxaAtivacao, calcTaxaRecorrenciaCartao, calcIndiceConciliacao, calcDeltaPct,
  CANAIS_ORIGEM, MODALIDADES, MODALIDADE_COLORS,
} from "@/data/strategicData";
// Fallback específico do histórico da Ser Feliz para meses sem dado no
// Supabase — ver comentário no topo do arquivo sobre adaptar/zerar num fork.
import { monthIndex, valuesByMonth as legacyValuesByMonth } from "@/data/legacyMonthlyFallback";

const conversionColors = ["#FDBA74", "#5EAAB8", "#1B7E91", "#0F5C6B", "#2D9CAD", "#F4A833"];

interface MonthlyReport {
  mes: string;
  receita_relacionamento: number;
  receita_real: number;
  receita_prevista_real: number;
  cadastros_ativos: number;
}

interface ChatterReport {
  mes: string;
  total_mensagens: number;
  mensagens_raqueline: number;
  mensagens_leticia: number;
  mensagens_aline: number;
  mensagens_evila: number;
  boletos_leticia: number;
}

interface FinancialReport {
  mes: string;
  cora: number;
  stone: number;
  asaas: number;
  receita_prevista: number;
}

interface DesfalqueReport {
  mes: string;
  modalidade: string;
  total_ativos: number;
  pagantes: number;
}

interface EmployeeReport {
  mes: string;
  funcionaria: string;
  mensagens_chatter: number;
  mensagens_manychat: number;
  tempo_resposta: number;
  conversao_atendidas: number;
  valor_reativado: number;
  ligacoes_realizadas: number;
  ligacoes_convertidas: number;
  ligacoes_aniversariantes: number;
  caixa_postal: number;
  bloqueados: number;
  invalidos: number;
  boletos_enviados: number;
  boletos_pagos: number;
}

// Exportadas (além de usadas neste arquivo) para poder testá-las
// isoladamente em useDashboardOverview.calc.test.ts, sem precisar montar o
// hook inteiro com mocks do Supabase.
export const valueOrFallback = (value: string | undefined, fallback: string) =>
  value?.trim() ? value : fallback;
export const getKpiValue = (kpis: typeof defaultKpiCards, label: string, fallback: string) =>
  valueOrFallback(kpis.find((kpi) => kpi.label === label)?.value, fallback);
// A importação gravou 0 em campos que não tinha dado (cadastros, volume) nos
// meses Jan–Mai. Como 0 não é um valor real ali, tratamos 0/null/undefined como
// "ausente" para cair no fallback em vez de exibir um zero falso.
export const presente = (v: number | null | undefined): number | null =>
  v != null && Number.isFinite(v) && v > 0 ? v : null;
// Acesso seguro aos arrays de legacyValuesByMonth: monthIndex mapeia mais
// meses (ex.: Jan/2026) do que esses arrays têm posições (o histórico fixo
// só cobre Fev–Jul), e o mês anterior ao mais antigo do fallback também cai
// fora do range. Um índice fora do array retorna `undefined`, que vira NaN
// em soma (`undefined + 5`) e quebra a página em `.toLocaleString()`; aqui
// tratamos esse "sem fallback" como `null` de forma explícita e uniforme,
// que soma como 0 e nunca quebra chamada de método.
export const legacyAt = (arr: readonly (number | null)[], index: number): number | null =>
  index >= 0 && index < arr.length ? arr[index] : null;
// Soma o que entrou via Cora/Stone/Asaas no mês — esses comprovantes não
// passam pela planilha de Oportunidades, então sem isso ficavam de fora da
// Receita Real e da Meta Cumprida mesmo depois de salvos no financeiro.
export const finExtra = (fr: { cora?: number | null; stone?: number | null; asaas?: number | null } | null | undefined) =>
  (fr?.cora ?? 0) + (fr?.stone ?? 0) + (fr?.asaas ?? 0);
export const parseDisplayNumber = (raw: string | undefined, fallback: number | null) => {
  if (!raw?.trim()) return fallback;
  const normalized = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (normalized === "" || normalized === "-") return fallback;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
};
export const parseKpiNumber = (kpis: typeof defaultKpiCards, label: string, fallback: number) =>
  parseDisplayNumber(kpis.find((kpi) => kpi.label === label)?.value, fallback) ?? fallback;

export function pctDelta(current: number | null, prev: number | null): number | null {
  if (current === null || prev === null || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Toda a lógica de dados do dashboard (Supabase + cálculos), compartilhada
 * pelas duas páginas: "Painel de Operação e Arrecadação" (Index.tsx, rota
 * "/") e "Indicadores Operacionais Detalhados" (rota /indicadores-detalhados).
 * Extraído para hook único para não duplicar as chamadas ao Supabase nem o
 * seletor de mês entre as duas páginas.
 */
export function useDashboardOverview() {
  const { overrides, employeeOverrides } = useDashboardData();
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [monthOpen, setMonthOpen] = useState(false);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [chatterReports, setChatterReports] = useState<ChatterReport[]>([]);
  const [financialReports, setFinancialReports] = useState<FinancialReport[]>([]);
  const [desfalqueReports, setDesfalqueReports] = useState<DesfalqueReport[]>([]);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [vacations, setVacations] = useState<{ funcionaria: string; data_inicio: string; data_fim: string; observacao: string | null }[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const { user } = useAuth();

  // ===== Painel de Operação e Arrecadação (bloco de entrada, padrão Lumen) =====
  const [canalFiltro, setCanalFiltro] = useState<string[]>([]);
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string[]>([]);
  const [strategicReports, setStrategicReports] = useState<StrategicKpiReport[]>([]);
  const [channelModalityReports, setChannelModalityReports] = useState<ChannelModalityReport[]>([]);
  const [donorStatusReports, setDonorStatusReports] = useState<DonorStatusReport[]>([]);
  const [donorFunnelReports, setDonorFunnelReports] = useState<DonorFunnelReport[]>([]);

  // Consulta em separado das demais (Promise.all próprio + catch próprio) de
  // propósito: essas 4 tabelas ainda não existem no Supabase (Débora vai
  // criá-las). Se a query falhar, só este bloco fica em "—" — o resto do
  // dashboard, que já funciona, não pode quebrar por causa disso.
  useEffect(() => {
    Promise.all([
      supabase.from("strategic_kpi_reports").select("*").order("mes", { ascending: true }),
      supabase.from("channel_modality_reports").select("*").order("mes", { ascending: true }),
      supabase.from("donor_status_reports").select("*").order("mes", { ascending: true }),
      supabase.from("donor_funnel_reports").select("*").order("mes", { ascending: true }),
    ]).then(([strategicRes, channelRes, statusRes, funnelRes]) => {
      if (strategicRes.data) setStrategicReports(strategicRes.data as StrategicKpiReport[]);
      if (channelRes.data) setChannelModalityReports(channelRes.data as ChannelModalityReport[]);
      if (statusRes.data) setDonorStatusReports(statusRes.data as DonorStatusReport[]);
      if (funnelRes.data) setDonorFunnelReports(funnelRes.data as DonorFunnelReport[]);
    }).catch((err) => {
      // Tabelas ainda não existem — esperado até a criação delas no Supabase.
      console.info("[useDashboardOverview] Tabelas estratégicas ainda não configuradas:", err?.message ?? err);
    });
  }, []);

  // Buscar dados do Supabase
  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      supabase
        .from("monthly_reports")
        .select("mes, receita_relacionamento, receita_real, receita_prevista_real, cadastros_ativos")
        .order("mes", { ascending: true }),
      supabase
        .from("chatter_reports")
        .select("*")
        .order("mes", { ascending: true }),
      supabase
        .from("financial_reports")
        .select("*")
        .order("mes", { ascending: true }),
      supabase
        .from("desfalque_reports")
        .select("*")
        .order("mes", { ascending: true }),
      supabase
        .from("employee_reports")
        .select("*")
        .order("mes", { ascending: true }),
      supabase
        .from("employee_vacations")
        .select("funcionaria, data_inicio, data_fim, observacao"),
    ]).then(([monthlyRes, chatterRes, financialRes, desfalqueRes, employeeRes, vacationsRes]) => {
      if (monthlyRes.data) setReports(monthlyRes.data);
      if (chatterRes.data) setChatterReports(chatterRes.data);
      if (financialRes.data) setFinancialReports(financialRes.data);
      if (desfalqueRes.data) setDesfalqueReports(desfalqueRes.data);
      if (employeeRes.data) setEmployeeReports(employeeRes.data);
      if (vacationsRes.data) setVacations(vacationsRes.data);
      setDataLoading(false);
    }).catch((err) => {
      // Sem este catch, qualquer falha (rede, RLS, tabela ausente) deixava
      // o dashboard preso para sempre em "Carregando...".
      console.error("[useDashboardOverview] Falha ao carregar dados do Supabase:", err);
      setDataLoading(false);
    });
  }, []);

  // Abre o dashboard no mês corrente (ex.: junho), que é o que a equipe está
  // operando. Considera tanto os meses do Supabase quanto os já conhecidos, e
  // só cai para o mês mais recente se o corrente não existir em lugar nenhum.
  // Só roda uma vez e respeita a navegação manual.
  const didInitMonth = useRef(false);
  useEffect(() => {
    if (didInitMonth.current) return;
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const known = new Set<string>([...reports.map((r) => r.mes), ...MONTHS.map((m) => m.id)]);
    const alvo = known.has(currentYM) ? currentYM : [...known].sort().at(-1);
    if (alvo) setSelectedMonth(alvo);
    didInitMonth.current = true;
  }, [reports]);

  const supabaseReport = reports.find((r) => r.mes === selectedMonth) ?? null;
  const prevSupabaseReport = reports.find((r) => {
    const [ano, mes] = selectedMonth.split("-").map(Number);
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    return r.mes === `${prevAno}-${String(prevMes).padStart(2, "0")}`;
  }) ?? null;

  const legacyIdx = monthIndex[selectedMonth] ?? 0;
  const legacyPrevIdx = legacyIdx + 1;

  const geral = geralByMonth[selectedMonth] ?? geralByMonth["2026-07"];
  const selectedLabel = valueOrFallback(overrides.periodo, MONTHS.find((m) => m.id === selectedMonth)?.label ?? selectedMonth);

  // Meses com dados reais no Supabase que ainda não estão na lista fixa MONTHS (ex: meses futuros recém-importados)
  const extraMonths = useMemo(() => {
    const knownIds = new Set(MONTHS.map((m) => m.id));
    return reports
      .filter((r) => !knownIds.has(r.mes))
      .map((r) => {
        const [ano, mes] = r.mes.split("-");
        const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return { id: r.mes, label: `${nomes[parseInt(mes) - 1]} ${ano}` };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [reports]);

  const allMonths = useMemo(() => [...extraMonths, ...MONTHS], [extraMonths]);

  const kpiCardsData = overrides.kpiCards ?? geral.kpiCards ?? defaultKpiCards;

  // Sparklines REAIS, derivadas do Supabase, em vez dos arrays fixos Jan–Jun
  // (que nunca se atualizavam e tinham um zero falso em junho). Mostram a
  // tendência dos meses ATÉ o mês selecionado e crescem sozinhas conforme você
  // importa novos meses. Tempo de Resposta e CSAT não têm tabela histórica no
  // banco, então ficam vazios e o card simplesmente não desenha o sparkline —
  // melhor mostrar nada do que um número inventado.
  const realSparklines = useMemo(() => {
    const serie = <T,>(rows: T[], mes: (r: T) => string, val: (r: T) => number | null | undefined): number[] =>
      rows
        .filter((r) => mes(r) <= selectedMonth)
        .map((r) => ({ m: mes(r), v: presente(val(r)) }))
        .filter((p) => p.v != null)
        .sort((a, b) => a.m.localeCompare(b.m))
        .slice(-8)
        .map((p) => p.v as number);
    return {
      volume: serie(chatterReports, (r) => r.mes, (r) => r.total_mensagens),
      receita: serie(reports, (r) => r.mes, (r) => r.receita_relacionamento),
    };
  }, [reports, chatterReports, selectedMonth]);

  // Usar dados do Supabase se disponíveis, senão fallback para dados hardcoded
  const financialReport = financialReports.find((r) => r.mes === selectedMonth) ?? null;
  // receita_relacionamento é só o que veio do Salesforce/relatórios (Oportunidades) —
  // "Comprovantes" precisa continuar refletindo só isso, sem Cora/Stone/Asaas.
  // Somados/formatados como número logo abaixo, então preenchem com 0 (não
  // null) quando não há fallback pro mês — receitaRealAtual/prevHeadline etc.
  // ficam null-safe pela soma com finExtra(), mas fmtBRL()/.toLocaleString()
  // direto quebrariam com null (ver legacyAt acima).
  const receitaRelacionamentoAtual = supabaseReport?.receita_relacionamento ?? (legacyAt(legacyValuesByMonth.receitaRel, legacyIdx) ?? 0);
  // O headline "Receita de Jun" é o total do mês: Salesforce + o que entrou em Cora/Stone/Asaas.
  const headlineRevenueAtual = receitaRelacionamentoAtual + finExtra(financialReport);
  // "Meta Cumprida"/"Receita Real YTD" também contam Cora/Stone/Asaas como realizado.
  const receitaRealAtual = (supabaseReport?.receita_real ?? legacyAt(legacyValuesByMonth.receitaReal, legacyIdx)) + finExtra(financialReport);
  const cadastrosAtivosNum = presente(supabaseReport?.cadastros_ativos) ?? legacyAt(legacyValuesByMonth.cadastros, legacyIdx);

  const financialRevenue = valueOrFallback(overrides.financialRevenue, fmtBRL(receitaRelacionamentoAtual));
  const headlineRevenue = overrides.financialRevenue?.trim() ? overrides.financialRevenue : fmtBRL(headlineRevenueAtual);
  const legacyReceitaPrev = legacyAt(legacyValuesByMonth.receitaPrev, legacyIdx);
  const financialGoal = supabaseReport?.receita_prevista_real
    ? fmtBRL(supabaseReport.receita_prevista_real)
    : financialReport?.receita_prevista
    ? fmtBRL(financialReport.receita_prevista)
    : valueOrFallback(overrides.financialGoal, legacyReceitaPrev != null ? fmtBRL(legacyReceitaPrev) : "—");
  const financialYTD = overrides.financialYTD?.trim() ? overrides.financialYTD : null;
  const financialYTDValue = valueOrFallback(overrides.financialYTDValue, fmtBRL(receitaRealAtual));
  const cadastrosAtivos = cadastrosAtivosNum != null ? cadastrosAtivosNum.toLocaleString("pt-BR") : "—";

  // Comprovantes = só Salesforce/relatórios, sem somar Cora/Stone/Asaas.
  const comprovantes = financialRevenue;
  const cora = financialReport?.cora ? fmtBRL(financialReport.cora) : getKpiValue(kpiCardsData, "Cora", geral.arrecadado.cora);
  const stone = financialReport?.stone ? fmtBRL(financialReport.stone) : getKpiValue(kpiCardsData, "Stone", geral.arrecadado.stone);
  const asaas = financialReport?.asaas ? fmtBRL(financialReport.asaas) : getKpiValue(kpiCardsData, "Asaas", "—");
  const displayCancelamentos = valueOrFallback(overrides.cancelamentos, geral.cancelamentos);
  const displayInadimplencia = valueOrFallback(overrides.inadimplencia, geral.inadimplencia);
  const displayRoiAtual = valueOrFallback(overrides.roiAtual, geral.roiAtual);

  const chatterReport = chatterReports.find((r) => r.mes === selectedMonth) ?? null;
  const prevChatterReport = chatterReports.find((r) => {
    const [ano, mes] = selectedMonth.split("-").map(Number);
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    return r.mes === `${prevAno}-${String(prevMes).padStart(2, "0")}`;
  }) ?? null;

  const receitaPrevistaAtual = supabaseReport?.receita_prevista_real || financialReport?.receita_prevista || (parseDisplayNumber(financialGoal, legacyReceitaPrev) ?? legacyReceitaPrev);
  const volumeAtual = presente(chatterReport?.total_mensagens) ?? parseDisplayNumber(kpiCardsData[1]?.value, legacyAt(legacyValuesByMonth.vol, legacyIdx));
  const tempoRespostaAtual = parseDisplayNumber(kpiCardsData[0]?.value, legacyAt(legacyValuesByMonth.resp, legacyIdx));
  const csatAtual = parseDisplayNumber(kpiCardsData[2]?.value, legacyAt(legacyValuesByMonth.csat, legacyIdx));
  const progressoManual = parseDisplayNumber(financialYTD ?? undefined, null);

  // Desfalque: usa dados reais do Supabase quando existem para o mês selecionado
  const desfalqueDoMes = desfalqueReports.filter((r) => r.mes === selectedMonth);
  const desfalqueData = desfalqueDoMes.length > 0
    ? [
        { name: "Pix", value: Math.max((desfalqueDoMes.find(d => d.modalidade === "Pix")?.total_ativos ?? 0) - (desfalqueDoMes.find(d => d.modalidade === "Pix")?.pagantes ?? 0), 0), fill: "#F59E0B" },
        { name: "Boleto", value: Math.max((desfalqueDoMes.find(d => d.modalidade === "Boleto")?.total_ativos ?? 0) - (desfalqueDoMes.find(d => d.modalidade === "Boleto")?.pagantes ?? 0), 0), fill: "#1B7E91" },
        { name: "Cartão de Crédito", value: Math.max((desfalqueDoMes.find(d => d.modalidade === "Cartão de Crédito")?.total_ativos ?? 0) - (desfalqueDoMes.find(d => d.modalidade === "Cartão de Crédito")?.pagantes ?? 0), 0), fill: "#10B981" },
      ]
    : [
        { name: "Boleto", value: parseKpiNumber(kpiCardsData, "Desfalque Boleto", geral.desfalqueData[0]?.value ?? 0), fill: "#1B7E91" },
        { name: "Cartão de Crédito", value: parseKpiNumber(kpiCardsData, "Desfalque Cartão", geral.desfalqueData[1]?.value ?? 0), fill: "#10B981" },
        { name: "Pix", value: parseKpiNumber(kpiCardsData, "Desfalque Pix", geral.desfalqueData[2]?.value ?? 0), fill: "#F59E0B" },
      ];

  // Deltas usando dados do Supabase quando disponíveis
  const prevFinancialReport = financialReports.find((r) => {
    const [ano, mes] = selectedMonth.split("-").map(Number);
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    return r.mes === `${prevAno}-${String(prevMes).padStart(2, "0")}`;
  }) ?? null;
  const prevReceitaRel = prevSupabaseReport?.receita_relacionamento ?? legacyAt(legacyValuesByMonth.receitaRel, legacyPrevIdx);
  const prevHeadlineRevenue = prevReceitaRel + finExtra(prevFinancialReport);
  const prevReceitaReal = (prevSupabaseReport?.receita_real ?? legacyAt(legacyValuesByMonth.receitaReal, legacyPrevIdx)) + finExtra(prevFinancialReport);

  const prevVolume = presente(prevChatterReport?.total_mensagens) ?? legacyAt(legacyValuesByMonth.vol, legacyPrevIdx);
  const dVol = pctDelta(volumeAtual, prevVolume ?? null);
  const dResp = pctDelta(tempoRespostaAtual, legacyAt(legacyValuesByMonth.resp, legacyPrevIdx));
  const dCsat = pctDelta(csatAtual, legacyAt(legacyValuesByMonth.csat, legacyPrevIdx));
  const dReceita = pctDelta(receitaRelacionamentoAtual, prevReceitaRel);
  const dHeadline = pctDelta(headlineRevenueAtual, prevHeadlineRevenue);
  const dReal = pctDelta(receitaRealAtual, prevReceitaReal);

  const cumprimentoMeta = useMemo(() => {
    if (progressoManual !== null) return progressoManual;
    return receitaPrevistaAtual && receitaPrevistaAtual > 0 ? ((receitaRealAtual ?? 0) / receitaPrevistaAtual) * 100 : 0;
  }, [progressoManual, receitaPrevistaAtual, receitaRealAtual]);

  const chartData = useMemo(() => {
    const chronologicalMonths = [...MONTHS].reverse();

    return chronologicalMonths.reduce<{
      evolucaoReceita: { month: string; value: number }[];
      receitaPrevReal: { month: string; prevista: number; real: number }[];
      conversaoFinanceira: { name: string; value: number; fill: string }[];
    }>((acc, month, chartIndex) => {
      const monthDataIndex = monthIndex[month.id] ?? 0;
      const supaRep = reports.find((r) => r.mes === month.id);
      const finRep = financialReports.find((r) => r.mes === month.id);
      const receitaRel = supaRep?.receita_relacionamento ?? legacyAt(legacyValuesByMonth.receitaRel, monthDataIndex);
      const receitaPrev = supaRep?.receita_prevista_real || finRep?.receita_prevista || legacyAt(legacyValuesByMonth.receitaPrev, monthDataIndex);
      const receitaReal = (supaRep?.receita_real ?? legacyAt(legacyValuesByMonth.receitaReal, monthDataIndex)) + finExtra(finRep);
      const conversao = receitaPrev && receitaPrev > 0 ? Number((((receitaReal ?? 0) / receitaPrev) * 100).toFixed(1)) : 0;

      acc.evolucaoReceita.push({ month: month.label, value: receitaRel ?? 0 });
      acc.receitaPrevReal.push({ month: month.label, prevista: receitaPrev ?? 0, real: receitaReal ?? 0 });
      acc.conversaoFinanceira.push({
        name: month.label,
        value: conversao,
        fill: conversionColors[chartIndex] ?? "#F97316",
      });

      return acc;
    }, { evolucaoReceita: [], receitaPrevReal: [], conversaoFinanceira: [] });
  }, [reports, financialReports, selectedMonth]);

  // ===== Cálculos do Painel de Operação e Arrecadação =====
  const prevMonthId = useMemo(() => {
    const [ano, mes] = selectedMonth.split("-").map(Number);
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    return `${prevAno}-${String(prevMes).padStart(2, "0")}`;
  }, [selectedMonth]);

  const strategicAtual = strategicReports.find((r) => r.mes === selectedMonth) ?? null;
  const strategicAnterior = strategicReports.find((r) => r.mes === prevMonthId) ?? null;

  const arrecadacaoAtiva = strategicAtual?.arrecadacao_ativa ?? null;
  const arrecadacaoAtivaAnterior = strategicAnterior?.arrecadacao_ativa ?? null;
  const deltaArrecadacao = calcDeltaPct(arrecadacaoAtiva, arrecadacaoAtivaAnterior);

  const taxaAtivacao = calcTaxaAtivacao(strategicAtual);
  const taxaRecorrenciaCartao = calcTaxaRecorrenciaCartao(strategicAtual);
  const indiceConciliacao = calcIndiceConciliacao(strategicAtual);
  const conciliacaoAtingida = indiceConciliacao !== null && indiceConciliacao > 95;

  const donorFunnelAtual = donorFunnelReports.find((r) => r.mes === selectedMonth) ?? null;
  const funnelStages = [
    { name: "Cadastro Inicial", value: donorFunnelAtual?.cadastro_inicial ?? null },
    { name: "Contato Realizado", value: donorFunnelAtual?.contato_realizado ?? null },
    { name: "Primeiro Pagamento", value: donorFunnelAtual?.primeiro_pagamento ?? null },
    { name: "Doador Ativo (Recorrente)", value: donorFunnelAtual?.doador_ativo ?? null },
  ];

  // Barras agrupadas (lado a lado, não empilhadas) por Canal x Modalidade,
  // respeitando os filtros de Canal de Origem e Modalidade selecionados.
  const canaisVisiveis = canalFiltro.length > 0 ? canalFiltro : [...CANAIS_ORIGEM];
  const modalidadesVisiveis = modalidadeFiltro.length > 0 ? modalidadeFiltro : [...MODALIDADES];
  const channelModalityAtual = channelModalityReports.filter((r) => r.mes === selectedMonth);
  const groupedBarData = canaisVisiveis.map((canal) => {
    const row = channelModalityAtual.find((r) => r.canal === canal);
    return {
      canal,
      "Cartão de Crédito": row?.cartao_credito ?? 0,
      "Cartão Recorrência": row?.cartao_recorrencia ?? 0,
      Boleto: row?.boleto ?? 0,
      Pix: row?.pix ?? 0,
    };
  });
  const groupedBarSeries = MODALIDADES.filter((m) => modalidadesVisiveis.includes(m)).map((m) => ({
    key: m,
    label: m,
    color: MODALIDADE_COLORS[m],
  }));
  const temDadosCanalModalidade = channelModalityReports.length > 0;

  // Últimos 6 meses (ordem cronológica) para o gráfico de 3 linhas em %.
  // Rótulo curto "Jan/26" em vez de "Jan 2026" (mais compacto no eixo X).
  const shortMonthLabel = (label: string) => {
    const [mon, year] = label.split(" ");
    return `${mon}/${year.slice(-2)}`;
  };
  // Gráfico "Variação de Doadores Ativos vs. Churn" — eixo duplo, variação de
  // ativos em quantidade x churn em %.
  // "Variação de Doadores Ativos" = ativos do mês - ativos do mês anterior
  // (Indicadores Estratégicos). NÃO é "Novos Doadores": não existe coluna
  // com a contagem de doadores efetivamente adquiridos no mês, só o total de
  // ativos por mês — então não dá pra separar quanto da variação veio de
  // gente nova x quanto veio de cancelamento, e por isso o nome reflete
  // exatamente o que o número é (a diferença líquida), sem inventar métrica.
  // "Churn" = Pct Cancelados do mês (Status dos Doadores, `pct_cancelados`) —
  // campo digitado manualmente no Upload como % (ver hint em Upload.tsx).
  // `mesesOrdenados[0]` (o mês mais antigo da lista) sempre fica com
  // variacaoAtivos null: não há mês anterior pra comparar.
  const mesesOrdenados = [...MONTHS].reverse();
  const donorStatusChartData = mesesOrdenados.map((m, i) => {
    const statusAtual = donorStatusReports.find((dr) => dr.mes === m.id);
    const ativosAtual = strategicReports.find((sr) => sr.mes === m.id)?.doadores_ativos ?? null;
    const mesAnterior = mesesOrdenados[i - 1];
    const ativosAnterior = mesAnterior ? strategicReports.find((sr) => sr.mes === mesAnterior.id)?.doadores_ativos ?? null : null;
    const variacaoAtivos = ativosAtual !== null && ativosAnterior !== null ? ativosAtual - ativosAnterior : null;
    return {
      month: shortMonthLabel(m.label),
      variacaoAtivos,
      churn: statusAtual?.pct_cancelados ?? null,
    };
  });

  const kpis: { label: string; value: string; meta: string; icon: any; tone: Tone; delta: number | null; higherIsBetter: boolean; sparkline: number[] }[] = [
    {
      label: kpiCardsData[0]?.label ?? "Tempo Médio de Resposta",
      value: kpiCardsData[0]?.value ?? (legacyAt(legacyValuesByMonth.resp, legacyIdx) !== null ? `${legacyAt(legacyValuesByMonth.resp, legacyIdx)} min` : "—"),
      meta: kpiCardsData[0]?.meta ?? "Meta: 10 min",
      icon: Clock,
      tone: "warning",
      delta: dResp,
      higherIsBetter: false,
      sparkline: [],
    },
    {
      label: kpiCardsData[1]?.label ?? "Volume Total Chatter",
      value: (volumeAtual ?? 0).toLocaleString("pt-BR"),
      meta: kpiCardsData[1]?.meta ?? "Mensagens no período",
      icon: MessageSquare,
      tone: "info",
      delta: dVol,
      higherIsBetter: true,
      sparkline: realSparklines.volume,
    },
    {
      label: kpiCardsData[2]?.label ?? "Satisfação (CSAT)",
      value: kpiCardsData[2]?.value ?? (legacyAt(legacyValuesByMonth.csat, legacyIdx) !== null ? String(legacyAt(legacyValuesByMonth.csat, legacyIdx)) : "—"),
      meta: kpiCardsData[2]?.meta ?? "Meta: 4.5",
      icon: Smile,
      tone: "primary",
      delta: dCsat,
      higherIsBetter: true,
      sparkline: [],
    },
    {
      label: kpiCardsData[3]?.label ?? "Receita Relacionamento",
      value: supabaseReport ? fmtBRL(receitaRelacionamentoAtual) : (kpiCardsData[3]?.value ?? fmtBRL(receitaRelacionamentoAtual)),
      meta: kpiCardsData[3]?.meta ?? `Realizado em ${selectedLabel}`,
      icon: Wallet,
      tone: "success",
      delta: dReceita,
      higherIsBetter: true,
      sparkline: realSparklines.receita,
    },
  ];

  const alerts: DashboardAlert[] = [];
  // Só dá para julgar a meta se houver receita realizada lançada (ou progresso
  // manual). Num mês em andamento/sem dados, não disparamos o alarme vermelho
  // falso — mostramos um aviso neutro.
  const temBaseDeMeta = progressoManual !== null || ((receitaRealAtual ?? 0) > 0 && (receitaPrevistaAtual ?? 0) > 0);
  if (!temBaseDeMeta) {
    alerts.push({
      level: "info",
      title: "Mês em andamento",
      description: `Ainda não há receita realizada lançada para ${selectedLabel}. A meta será calculada quando os dados do mês forem importados.`,
    });
  } else if (cumprimentoMeta < 50) {
    const faltaMeta = Math.max((receitaPrevistaAtual ?? 0) - (receitaRealAtual ?? 0), 0);
    alerts.push({
      level: "danger",
      title: `Meta mensal em ${cumprimentoMeta.toFixed(1)}%`,
      description: `Faltam R$ ${faltaMeta.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para bater a meta de ${selectedLabel}.`,
    });
  } else if (cumprimentoMeta < 80) {
    alerts.push({
      level: "warning",
      title: `Meta em ${cumprimentoMeta.toFixed(1)}%`,
      description: "Atenção: ritmo abaixo do ideal para fechar o mês na meta.",
    });
  } else {
    alerts.push({
      level: "success",
      title: `Meta em ${cumprimentoMeta.toFixed(1)}%`,
      description: "Performance saudável, mantenha o ritmo de reativações.",
    });
  }
  if (temBaseDeMeta && dReceita !== null && dReceita < -20) {
    alerts.push({
      level: "danger",
      title: `Receita caiu ${Math.abs(dReceita).toFixed(1)}%`,
      description: "Queda relevante vs mês anterior. Revise pipeline de reativação.",
    });
  }
  if (temBaseDeMeta && dVol !== null && dVol < -30) {
    alerts.push({
      level: "warning",
      title: `Volume Chatter ${dVol.toFixed(1)}%`,
      description: "Menor engajamento entrando: avalie campanhas e horários de pico.",
    });
  }
  if (tempoRespostaAtual !== null && tempoRespostaAtual > 10) {
    alerts.push({
      level: "warning",
      title: "TMR acima da meta",
      description: `Tempo médio de ${tempoRespostaAtual} min — meta é 10 min.`,
    });
  }

  const FUNC_LABELS: Record<string, string> = {
    raqueline: "Raqueline",
    leticia: "Letícia",
    aline: "Aline",
    evila: "Évila",
  };
  const FUNC_ORDER = ["raqueline", "leticia", "aline", "evila"];

  const employeeSummaries: EmployeeSummary[] = useMemo(() => {
    const empDoMes = employeeReports.filter((r) => r.mes === selectedMonth);
    const chatterDoMes = chatterReports.find((r) => r.mes === selectedMonth) ?? null;
    const [ano, mes] = selectedMonth.split("-").map(Number);
    const monthStart = new Date(ano, mes - 1, 1);
    const monthEnd = new Date(ano, mes, 0);

    const chatterPorFunc: Record<string, number> = chatterDoMes
      ? {
          raqueline: chatterDoMes.mensagens_raqueline,
          leticia: chatterDoMes.mensagens_leticia,
          aline: chatterDoMes.mensagens_aline,
          evila: chatterDoMes.mensagens_evila,
        }
      : {};

    return FUNC_ORDER.map((funcId) => {
      const r = empDoMes.find((e) => e.funcionaria === funcId);
      const conversao = r && r.ligacoes_realizadas > 0 && r.ligacoes_convertidas > 0
        ? (r.ligacoes_convertidas / r.ligacoes_realizadas) * 100
        : null;

      const vacation = vacations.find((v) => {
        if (v.funcionaria !== funcId) return false;
        const inicio = new Date(v.data_inicio);
        const fim = new Date(v.data_fim);
        return inicio <= monthEnd && fim >= monthStart;
      }) ?? null;

      return {
        name: FUNC_LABELS[funcId],
        receitaReativada: r?.valor_reativado ?? 0,
        conversao,
        mensagensChatter: chatterPorFunc[funcId] ?? 0,
        ligacoesRealizadas: r?.ligacoes_realizadas ?? 0,
        boletosEnviados: r?.boletos_enviados ?? 0,
        boletosPagos: r?.boletos_pagos ?? 0,
        isLeticia: funcId === "leticia",
        vacationInfo: vacation
          ? `Férias de ${vacation.data_inicio.split("-").reverse().slice(0, 2).join("/")} a ${vacation.data_fim.split("-").reverse().slice(0, 2).join("/")}`
          : null,
      };
    });
  }, [employeeReports, chatterReports, vacations, selectedMonth]);

  return {
    // seletor de mês / navegação
    selectedMonth, setSelectedMonth, monthOpen, setMonthOpen, selectedLabel, allMonths, reports, dataLoading,
    user,
    // painel de entrada (Lumen)
    canalFiltro, setCanalFiltro, modalidadeFiltro, setModalidadeFiltro,
    arrecadacaoAtiva, deltaArrecadacao, taxaAtivacao, taxaRecorrenciaCartao, indiceConciliacao, conciliacaoAtingida,
    funnelStages, groupedBarData, groupedBarSeries, temDadosCanalModalidade, donorStatusChartData,
    // indicadores detalhados
    headlineRevenue, dHeadline, financialYTD, cumprimentoMeta, cadastrosAtivos, financialGoal, volumeAtual,
    comprovantes, cora, stone, asaas, alerts, kpis, chartData, employeeSummaries, financialYTDValue,
    desfalqueData, displayCancelamentos, displayInadimplencia, displayRoiAtual,
  };
}
