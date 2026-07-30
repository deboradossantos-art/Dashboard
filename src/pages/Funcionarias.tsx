import { useState, useEffect, useMemo } from "react";
import { Plane } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import EmployeeTab from "@/components/dashboard/EmployeeTab";
import ExportPdfButton from "@/components/dashboard/ExportPdfButton";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import {
  employeeTabs,
  MONTHS,
  assistenteByMonth,
  leticiaByMonth,
  alineByMonth,
  evilaByMonth,
} from "@/data/employeeData";

const tabs = employeeTabs.filter((tab) => tab.id !== "geral");

interface ChatterReport {
  mes: string;
  total_mensagens: number;
  mensagens_raqueline: number;
  mensagens_leticia: number;
  mensagens_aline: number;
  mensagens_evila: number;
  boletos_leticia: number;
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

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(v: number) { return v > 0 ? v.toLocaleString("pt-BR") : null; }
function fmtPct(v: number) { return v > 0 ? `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : null; }
function fmtMin(v: number) { return v > 0 ? `${v} min` : null; }

const LABEL_MAP: Record<string, (emp: EmployeeReport, chatter: ChatterReport | undefined, funcId: string) => string | null> = {
  "Mensagens Mensais no Chatter": (emp, chatter, funcId) => {
    const vals: Record<string, number> = {
      assis: chatter?.mensagens_raqueline ?? 0,
      raqueline: chatter?.mensagens_raqueline ?? 0,
      leticia: chatter?.mensagens_leticia ?? 0,
      aline: chatter?.mensagens_aline ?? 0,
      evila: chatter?.mensagens_evila ?? 0,
    };
    return fmtNum(vals[funcId] ?? 0);
  },
  "Total de Mensagens (Manychat)": (emp) => fmtNum(emp.mensagens_manychat),
  "Total de Mensagens Processadas": (emp) => fmtNum(emp.mensagens_manychat),
  "Tempo Médio de Resposta (Chat)": (emp) => fmtMin(emp.tempo_resposta),
  "Conversão sobre Atendidas": (emp) => {
    if (emp.ligacoes_convertidas > 0 && emp.ligacoes_realizadas > 0)
      return fmtPct((emp.ligacoes_convertidas / emp.ligacoes_realizadas) * 100);
    return fmtPct(emp.conversao_atendidas);
  },
  "Valor Total Reativado": (emp) => emp.valor_reativado > 0 ? fmtBRL(emp.valor_reativado) : null,
  "Total de Ligações Realizadas": (emp) => fmtNum(emp.ligacoes_realizadas),
  "Ligações para Aniversariantes": (emp) => fmtNum(emp.ligacoes_aniversariantes),
  "Ligações Efetuadas": (emp) => fmtNum(emp.ligacoes_realizadas),
  "Caixa Postal": (emp) => fmtNum(emp.caixa_postal),
  "Caixa-postal": (emp) => fmtNum(emp.caixa_postal),
  "Bloqueados": (emp) => fmtNum(emp.bloqueados),
  "Inválidos": (emp) => fmtNum(emp.invalidos),
  "Boletos Enviados": (emp, chatter) => {
    if (emp.boletos_enviados > 0) return fmtNum(emp.boletos_enviados);
    return chatter?.boletos_leticia ? fmtNum(chatter.boletos_leticia) : null;
  },
  "Taxa de Boletos Pagos": (emp) => {
    if (emp.boletos_pagos > 0 && emp.boletos_enviados > 0)
      return fmtPct((emp.boletos_pagos / emp.boletos_enviados) * 100);
    return null;
  },
};

const FUNC_ID_TO_DB: Record<string, string> = {
  assis: "raqueline",
  leticia: "leticia",
  aline: "aline",
  evila: "evila",
};

const EMPTY_EMP = (mes: string, funcId: string): EmployeeReport => ({
  mes, funcionaria: funcId,
  mensagens_chatter: 0, mensagens_manychat: 0, tempo_resposta: 0,
  conversao_atendidas: 0, valor_reativado: 0, ligacoes_realizadas: 0,
  ligacoes_convertidas: 0, ligacoes_aniversariantes: 0, caixa_postal: 0,
  bloqueados: 0, invalidos: 0, boletos_enviados: 0, boletos_pagos: 0,
});

const Funcionarias = () => {
  const { employeeOverrides } = useDashboardData();
  const [activeTab, setActiveTab] = useState("assis");
  const [assistenteMonth, setAssistenteMonth] = useState("2026-07");
  const [leticiaMonth, setLeticiaMonth] = useState("2026-07");
  const [alineMonth, setAlineMonth] = useState("2026-07");
  const [evilaMonth, setEvilaMonth] = useState("2026-07");
  const [chatterReports, setChatterReports] = useState<ChatterReport[]>([]);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReport[]>([]);
  const [vacations, setVacations] = useState<{ funcionaria: string; data_inicio: string; data_fim: string; observacao: string | null }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("chatter_reports").select("*").order("mes", { ascending: true }),
      supabase.from("employee_reports").select("*").order("mes", { ascending: true }),
      supabase.from("employee_vacations").select("funcionaria, data_inicio, data_fim, observacao"),
    ]).then(([{ data: cd }, { data: ed }, { data: vd }]) => {
      if (cd) setChatterReports(cd);
      if (ed) setEmployeeReports(ed);
      if (vd) setVacations(vd);
      setLoaded(true);
    });
  }, []);

  // Usar useMemo para recalcular quando os dados chegam
  const mergeEmployee = useMemo(() => {
    return (defaultData: any, funcId: string, month: string) => {
      const override = employeeOverrides[funcId]?.[month];
      const chatter = chatterReports.find((r) => r.mes === month);
      const funcDbId = FUNC_ID_TO_DB[funcId] ?? funcId;
      const empReport = employeeReports.find((r) => r.mes === month && r.funcionaria === funcDbId);

      let data = { ...defaultData };
      if (override) {
        data = {
          ...data,
          kpis: override.kpis ?? data.kpis,
          additionalMetrics: override.additionalMetrics ?? data.additionalMetrics,
        };
      }

      if (loaded && (chatter || empReport)) {
        const emp = empReport ?? EMPTY_EMP(month, funcId);
        const injectValue = (label: string): string | null => {
          const fn = LABEL_MAP[label];
          return fn ? fn(emp, chatter, funcId) : null;
        };

        data = {
          ...data,
          kpis: (data.kpis ?? []).map((kpi: any) => {
            const val = injectValue(kpi.label);
            return val !== null ? { ...kpi, value: val } : kpi;
          }),
          additionalMetrics: (data.additionalMetrics ?? []).map((m: any) => {
            const val = injectValue(m.label);
            return val !== null ? { ...m, value: val } : m;
          }),
        };
      }

      return data;
    };
  }, [chatterReports, employeeReports, employeeOverrides, loaded]);

  const assistente = mergeEmployee(assistenteByMonth[assistenteMonth] ?? assistenteByMonth["2026-07"], "assis", assistenteMonth);
  const leticia = mergeEmployee(leticiaByMonth[leticiaMonth] ?? leticiaByMonth["2026-07"], "leticia", leticiaMonth);
  const aline = mergeEmployee(alineByMonth[alineMonth] ?? alineByMonth["2026-07"], "aline", alineMonth);
  const evila = mergeEmployee(evilaByMonth[evilaMonth] ?? evilaByMonth["2026-07"], "evila", evilaMonth);

  // Resumo Mensal Comparativo / Evolução Anual: antes recebiam o objeto ESTÁTICO de employeeData.ts
  // (nunca atualizado pelo Supabase). Agora mesclamos mês a mês, igual ao mês selecionado acima,
  // para que a tabela e o gráfico de evolução reflitam os dados reais de todos os meses.
  const buildYearlyByMonth = useMemo(() => {
    return (defaultByMonth: Record<string, any>, funcId: string) => {
      const fallback = defaultByMonth["2026-07"];
      const result: Record<string, any> = {};
      MONTHS.forEach(({ id }) => {
        result[id] = mergeEmployee(defaultByMonth[id] ?? fallback, funcId, id);
      });
      return result;
    };
  }, [mergeEmployee]);

  // Dados brutos (não formatados) do mês selecionado, usados para montar os gráficos de composição
  // (o que existe de fato no banco) no lugar das antigas séries diárias fictícias.
  const getRaw = (funcId: string, month: string) => {
    const funcDbId = FUNC_ID_TO_DB[funcId] ?? funcId;
    const chatter = chatterReports.find((r) => r.mes === month);
    const emp = employeeReports.find((r) => r.mes === month && r.funcionaria === funcDbId) ?? EMPTY_EMP(month, funcId);
    return { chatter, emp };
  };

  const { chatter: rChatter, emp: rEmp } = getRaw("assis", assistenteMonth);
  const raqMessageTypes = [
    { name: "Chatter", value: rChatter?.mensagens_raqueline ?? 0, fill: "#3B82F6" },
    { name: "Ligações", value: rEmp.ligacoes_realizadas ?? 0, fill: "#10B981" },
  ].filter((d) => d.value > 0);

  const { chatter: lChatter, emp: lEmp } = getRaw("leticia", leticiaMonth);
  const leticiaBoletosEnviados = lEmp.boletos_enviados || lChatter?.boletos_leticia || 0;
  const leticiaBoletos = [
    { name: "Enviados", value: leticiaBoletosEnviados },
    { name: "Pagos", value: lEmp.boletos_pagos ?? 0 },
  ].filter((d) => d.value > 0);

  const { emp: aEmp } = getRaw("aline", alineMonth);
  const alineDistribuicao = [
    { name: "Realizadas", value: aEmp.ligacoes_realizadas },
    { name: "Convertidas", value: aEmp.ligacoes_convertidas },
    { name: "Caixa-postal", value: aEmp.caixa_postal },
    { name: "Bloqueados", value: aEmp.bloqueados },
    { name: "Inválidos", value: aEmp.invalidos },
  ].filter((d) => d.value > 0);

  const { emp: eEmp } = getRaw("evila", evilaMonth);
  const evilaAtendidas = Math.max(eEmp.ligacoes_realizadas - eEmp.caixa_postal - eEmp.bloqueados - eEmp.invalidos, 0);
  const evilaResultReal = [
    { name: "Convertidas", value: eEmp.ligacoes_convertidas, fill: "#10B981" },
    { name: "Não convertidas", value: Math.max(evilaAtendidas - eEmp.ligacoes_convertidas, 0), fill: "#E5E7EB" },
  ].filter((d) => d.value > 0);
  const evilaFunnelReal = [
    { name: "Convertidas", value: eEmp.ligacoes_convertidas },
    { name: "Caixa-postal", value: eEmp.caixa_postal },
    { name: "Bloqueados", value: eEmp.bloqueados },
    { name: "Inválidos", value: eEmp.invalidos },
  ].filter((d) => d.value > 0);

  const selectedMonth =
    activeTab === "assis" ? assistenteMonth :
    activeTab === "leticia" ? leticiaMonth :
    activeTab === "aline" ? alineMonth :
    evilaMonth;

  const selectedLabel = MONTHS.find((m) => m.id === selectedMonth)?.label ?? selectedMonth;

  // Verifica se a funcionária da aba ativa teve férias que se sobrepõem ao mês selecionado
  const activeVacation = useMemo(() => {
    const funcDbId = FUNC_ID_TO_DB[activeTab] ?? activeTab;
    const [ano, mes] = selectedMonth.split("-").map(Number);
    const monthStart = new Date(ano, mes - 1, 1);
    const monthEnd = new Date(ano, mes, 0);

    return vacations.find((v) => {
      if (v.funcionaria !== funcDbId) return false;
      const inicio = new Date(v.data_inicio);
      const fim = new Date(v.data_fim);
      return inicio <= monthEnd && fim >= monthStart;
    }) ?? null;
  }, [vacations, activeTab, selectedMonth]);

  const fmtDateBR = (d: string) => {
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}`;
  };

  const vacationsFor = (funcId: string) => {
    const funcDbId = FUNC_ID_TO_DB[funcId] ?? funcId;
    return vacations.filter((v) => v.funcionaria === funcDbId);
  };

  const header = (
    <div className="px-4 sm:px-6 lg:px-10 py-5 flex items-center justify-between gap-4 max-w-[1500px] mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          Dashboard <span className="text-gradient-primary">Funcionárias</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Período: {selectedLabel}</p>
      </div>
      <ExportPdfButton
        targetId="funcionarias-export"
        fileName={`${activeTab}-${selectedMonth}.pdf`}
        title={`${tabs.find((t) => t.id === activeTab)?.label ?? ""} - ${selectedLabel}`}
      />
    </div>
  );

  return (
    <AppShell header={header}>
      <div className="bg-card/60 backdrop-blur-md border border-border rounded-lg sticky top-[89px] z-20">
        <div className="px-3">
          <div className="flex overflow-x-auto gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-b-primary text-primary"
                    : "border-b-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="funcionarias-export" className="space-y-8">
        {activeVacation && (
          <div className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/10 px-4 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-info/15 text-info shrink-0">
              <Plane className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {tabs.find((t) => t.id === activeTab)?.label} esteve de férias de {fmtDateBR(activeVacation.data_inicio)} a {fmtDateBR(activeVacation.data_fim)} neste período
              </p>
              {activeVacation.observacao && <p className="text-xs text-muted-foreground mt-0.5">{activeVacation.observacao}</p>}
            </div>
          </div>
        )}
        {activeTab === "assis" && (
          <EmployeeTab
            sectionTitle="Métricas de Raqueline"
            kpis={assistente.kpis}
            charts={[
              ...(raqMessageTypes.length > 0 ? [{ title: "Chatter vs Ligações no Mês", type: "pie" as const, data: raqMessageTypes }] : []),
            ]}
            additionalMetrics={assistente.additionalMetrics}
            selectedMonth={assistenteMonth}
            onMonthChange={setAssistenteMonth}
            byMonth={buildYearlyByMonth(assistenteByMonth, "assis")}
            yearlyKpiIndexes={[0, 1, 2, 3]}
            yearlyColors={["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B"]}
            vacations={vacationsFor("assis")}
          />
        )}

        {activeTab === "leticia" && (
          <EmployeeTab
            sectionTitle="Métricas de Letícia"
            kpis={leticia.kpis}
            charts={[
              ...(leticiaBoletos.length > 0 ? [{ title: "Boletos Enviados vs Pagos no Mês", type: "bar" as const, data: leticiaBoletos, xKey: "name", yKey: "value", color: "#1B7E91", label: "Quantidade" }] : []),
            ]}
            additionalMetrics={leticia.additionalMetrics}
            selectedMonth={leticiaMonth}
            onMonthChange={setLeticiaMonth}
            byMonth={buildYearlyByMonth(leticiaByMonth, "leticia")}
            yearlyKpiIndexes={[0, 2]}
            yearlyColors={["#8B5CF6", "#3B82F6"]}
            vacations={vacationsFor("leticia")}
          />
        )}

        {activeTab === "aline" && (
          <EmployeeTab
            sectionTitle="Métricas de Aline"
            kpis={aline.kpis}
            charts={[
              ...(alineDistribuicao.length > 0 ? [{ title: "Distribuição das Ligações no Mês", type: "bar" as const, data: alineDistribuicao, xKey: "name", yKey: "value", color: "#1B7E91", label: "Quantidade" }] : []),
            ]}
            additionalMetrics={aline.additionalMetrics}
            selectedMonth={alineMonth}
            onMonthChange={setAlineMonth}
            byMonth={buildYearlyByMonth(alineByMonth, "aline")}
            yearlyKpiIndexes={[2, 3, 4, 5]}
            yearlyColors={["#8B5CF6", "#3B82F6", "#EF4444", "#F59E0B"]}
            vacations={vacationsFor("aline")}
          />
        )}

        {activeTab === "evila" && (
          <EmployeeTab
            sectionTitle="Métricas de Évila"
            kpis={evila.kpis}
            charts={[
              ...(evilaFunnelReal.length > 0 ? [{ title: "Distribuição das Ligações Efetuadas no Mês", type: "bar" as const, data: evilaFunnelReal, xKey: "name", yKey: "value", color: "#1B7E91", label: "Quantidade" }] : []),
              ...(evilaResultReal.length > 0 ? [{ title: "Resultado das Ligações Atendidas no Mês", type: "pie" as const, data: evilaResultReal }] : []),
            ]}
            additionalMetrics={evila.additionalMetrics}
            selectedMonth={evilaMonth}
            onMonthChange={setEvilaMonth}
            byMonth={buildYearlyByMonth(evilaByMonth, "evila")}
            yearlyKpiIndexes={[0, 3, 4, 5]}
            yearlyColors={["#8B5CF6", "#10B981", "#3B82F6", "#F59E0B"]}
            vacations={vacationsFor("evila")}
          />
        )}
      </div>
    </AppShell>
  );
};

export default Funcionarias;
