export const employeeTabs = [
  { id: "geral", label: "Visão Geral" },
  { id: "assis", label: "Raqueline" },
  { id: "leticia", label: "Letícia" },
  { id: "aline", label: "Aline" },
  { id: "evila", label: "Évila" },
];

export const MONTHS = [
  { id: "2026-07", label: "Jul 2026" },
  { id: "2026-06", label: "Jun 2026" },
  { id: "2026-05", label: "Mai 2026" },
  { id: "2026-04", label: "Abr 2026" },
  { id: "2026-03", label: "Mar 2026" },
  { id: "2026-02", label: "Fev 2026" },
  { id: "2026-01", label: "Jan 2026" },
];

function genTrend(base: number[], seed: number) {
  return base.map((v, i) => ({ day: i + 1, value: +(v * (1 + (seed - 3) * 0.015) + (i % 5) * 0.1 * seed).toFixed(1) }));
}
function genMonthlyConversion(base: number[], seed: number) {
  return base.map((v, i) => ({ month: `Mês ${i + 1}`, value: Math.round(v * (1 + (seed - 3) * 0.04)) }));
}

// ===== RAQUELINE =====
export const assistenteByMonth: Record<string, {
  kpis: { label: string; value: string; meta: string; color: "blue" | "green" | "red" }[];
  messagesData: { day: number; value: number }[];
  engagementData: { day: number; value: number }[];
  messageTypesData: { name: string; value: number; fill: string }[];
  additionalMetrics: { label: string; value: string; borderColor: string }[];
}> = {
  "2026-07": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "—", meta: "Jul 2026", color: "blue" },
    ],
    messagesData: [],
    engagementData: [],
    messageTypesData: [],
    additionalMetrics: [],
  },
  "2026-06": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "—", meta: "Mês atual", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "90%", meta: "36 ativações / 40 atendidas", color: "green" },
      { label: "Valor Total Reativado", value: "R$ 5.452,00", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "202", meta: "Período atual", color: "blue" },
    ],
    messagesData: [
      { day: 26, value: 59 },
      { day: 27, value: 76 },
      { day: 28, value: 33 },
      { day: 29, value: 34 },
    ],
    engagementData: [
      { day: 26, value: 11 },
      { day: 27, value: 13 },
      { day: 28, value: 5 },
      { day: 29, value: 7 },
    ],
    messageTypesData: [
      { name: "Chatter", value: 233, fill: "#3B82F6" },
      { name: "Ligações", value: 202, fill: "#10B981" },
    ],
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "202", borderColor: "#1B7E91" },
      { label: "Ligações Atendidas", value: "40 (19,8%)", borderColor: "#10B981" },
      { label: "Conversões", value: "36 (90,0%)", borderColor: "#10B981" },
      { label: "Caixa-postal", value: "47", borderColor: "#F59E0B" },
      { label: "Inválidos", value: "14", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "0", borderColor: "#EF4444" },
    ],
  },
  "2026-04": {
    kpis: [
      { label: "Total de Mensagens Processadas", value: "0", meta: "Período atual", color: "blue" },
      { label: "Taxa de Engajamento ManyChat", value: "0%", meta: "Meta: 65%", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "0 min", meta: "Meta: 5min", color: "blue" },
      { label: "Satisfação (CSAT) ManyChat", value: "0", meta: "Meta: 4.5", color: "blue" },
    ],
    messagesData: [],
    engagementData: [],
    messageTypesData: [],
    additionalMetrics: [],
  },
  "2026-03": {
    kpis: [
      { label: "Total de Mensagens Processadas", value: "0", meta: "Mar 2026", color: "blue" },
      { label: "Taxa de Engajamento ManyChat", value: "0%", meta: "Meta: 65%", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "0 min", meta: "Meta: 5min", color: "blue" },
      { label: "Satisfação (CSAT) ManyChat", value: "0", meta: "Meta: 4.5", color: "blue" },
    ],
    messagesData: [],
    engagementData: [],
    messageTypesData: [],
    additionalMetrics: [],
  },
  "2026-02": {
    kpis: [
      { label: "Total de Mensagens Processadas", value: "0", meta: "Fev 2026", color: "blue" },
      { label: "Taxa de Engajamento ManyChat", value: "0%", meta: "Meta: 65%", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "0 min", meta: "Meta: 5min", color: "blue" },
      { label: "Satisfação (CSAT) ManyChat", value: "0", meta: "Meta: 4.5", color: "blue" },
    ],
    messagesData: [],
    engagementData: [],
    messageTypesData: [],
    additionalMetrics: [],
  },
  "2026-01": {
    kpis: [
      { label: "Total de Mensagens Processadas", value: "0", meta: "Jan 2026", color: "blue" },
      { label: "Taxa de Engajamento ManyChat", value: "0%", meta: "Meta: 65%", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "0 min", meta: "Meta: 5min", color: "blue" },
      { label: "Satisfação (CSAT) ManyChat", value: "0", meta: "Meta: 4.5", color: "blue" },
    ],
    messagesData: [],
    engagementData: [],
    messageTypesData: [],
    additionalMetrics: [],
  },
};

// ===== LETÍCIA =====
const leticiaMsgBase = [120,125,118,130,135,140,128,125,138,145,132,128,142,150,138,132,148,155,143,138,152,160,148,142,158,165,152,148,162,170];

export const leticiaByMonth: Record<string, {
  kpis: { label: string; value: string; meta: string; color: "blue" | "green" | "red" }[];
  attendanceData: { day: number; value: number }[];
  reasonsData: { name: string; value: number; fill: string }[];
  additionalMetrics: { label: string; value: string; borderColor: string }[];
}> = {
  "2026-07": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "—", meta: "Meta: 70%", color: "blue" },
      { label: "Boletos Enviados", value: "—", meta: "Jul 2026", color: "blue" },
    ],
    attendanceData: [],
    reasonsData: [],
    additionalMetrics: [],
  },
  "2026-06": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "—", meta: "Meta: 70%", color: "blue" },
      { label: "Boletos Enviados", value: "—", meta: "Jun 2026", color: "blue" },
    ],
    attendanceData: [],
    reasonsData: [],
    additionalMetrics: [],
  },
  "2026-05": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "231", meta: "Mai 2026", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "—", meta: "Meta: 70%", color: "blue" },
      { label: "Boletos Enviados", value: "156", meta: "Mai 2026", color: "blue" },
    ],
    attendanceData: [45,34,0,0,0,17,24,9,41,7,0,0,0,28,35,41,15,0,0,35].map((v, i) => ({ day: i + 1, value: v })),
    reasonsData: [
      { name: "Atrasados do Cora", value: 4, fill: "#1B7E91" },
      { name: "Erro no Manychat", value: 25, fill: "#3B82F6" },
      { name: "Envio de Boletos", value: 156, fill: "#10B981" },
    ],
    additionalMetrics: [],
  },
  "2026-04": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "331", meta: "Mês atual", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "78,3%", meta: "Meta: 70%", color: "green" },
      { label: "Boletos Enviados", value: "152", meta: "Abr 2026", color: "blue" },
    ],
    attendanceData: genTrend(leticiaMsgBase, 6),
    reasonsData: [
      { name: "Atrasados do Cora", value: 4, fill: "#1B7E91" },
      { name: "Erro no Manychat", value: 25, fill: "#3B82F6" },
      { name: "Envio de Boletos", value: 152, fill: "#10B981" },
    ],
    additionalMetrics: [],
  },
  "2026-03": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "375", meta: "Mês atual", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "81,55%", meta: "Meta: 70%", color: "green" },
      { label: "Boletos Enviados", value: "168", meta: "Mês atual", color: "blue" },
    ],
    attendanceData: genTrend(leticiaMsgBase, 5),
    reasonsData: [
      { name: "Atrasados do Cora", value: 1, fill: "#1B7E91" },
      { name: "Erro no Manychat", value: 84, fill: "#3B82F6" },
      { name: "Envio de Boletos", value: 168, fill: "#10B981" },
    ],
    additionalMetrics: [],
  },
  "2026-02": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "599", meta: "Fev 2026", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "67,52%", meta: "Meta: 70%", color: "red" },
      { label: "Boletos Enviados", value: "136", meta: "Fev 2026", color: "blue" },
    ],
    attendanceData: genTrend(leticiaMsgBase, 4),
    reasonsData: [
      { name: "Atrasados do Cora", value: 377, fill: "#1B7E91" },
      { name: "Erro no Manychat", value: 86, fill: "#3B82F6" },
      { name: "Envio de Boletos", value: 136, fill: "#10B981" },
    ],
    additionalMetrics: [],
  },
  "2026-01": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "1.422", meta: "Jan 2026", color: "blue" },
      { label: "Taxa de Boletos Pagos", value: "72,65%", meta: "Meta: 70%", color: "green" },
      { label: "Boletos Enviados", value: "158", meta: "Jan 2026", color: "blue" },
    ],
    attendanceData: genTrend(leticiaMsgBase, 3),
    reasonsData: [
      { name: "Atrasados do Cora", value: 263, fill: "#1B7E91" },
      { name: "Erro no Manychat", value: 48, fill: "#3B82F6" },
      { name: "Envio de Boletos", value: 158, fill: "#10B981" },
    ],
    additionalMetrics: [],
  },
};

// ===== ALINE =====
const alineCallsBase = [6,7,6,7,8,7,6,7,6,7,8,7,6,7,8,7,6,7,6,7,8,7,6,7,8,7,6,7,8,8];
const alineConvBase = [18,20,22,21,19,23,20,22,21,24,20,22,21,23,20,22,21,24,20,22,21,23,20,22,21,24,20,22,21,23];

export const alineByMonth: Record<string, {
  kpis: { label: string; value: string; meta: string; color: "blue" | "green" | "red" }[];
  callsData: { day: number; value: number }[];
  conversionData: { day: number; value: number }[];
  timeDistributionData: { hour: string; value: number }[];
  monthlyConversionData: { month: string; value: number }[];
  additionalMetrics: { label: string; value: string; borderColor: string }[];
}> = {
  "2026-07": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "—", meta: "Jul 2026", color: "blue" },
    ],
    callsData: [],
    conversionData: [],
    timeDistributionData: [],
    monthlyConversionData: [],
    additionalMetrics: [],
  },
  "2026-06": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "—", meta: "Jun 2026", color: "blue" },
    ],
    callsData: [],
    conversionData: [],
    timeDistributionData: [],
    monthlyConversionData: [],
    additionalMetrics: [],
  },
  "2026-05": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "208", meta: "Mai 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "50%", meta: "1 conversão / 2 atendidas", color: "green" },
      { label: "Valor Total Reativado", value: "R$ 4.800,00", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "20", meta: "Período atual", color: "blue" },
    ],
    callsData: [0,0,0,0,0,0,0,15,15,0,0,15,0,39,15,15,0,0,20,20,15,15,0,0,0,0,0,0,0,20].map((v,i)=>({day:i+1,value:v})),
    conversionData: [0,0,0,0,0,0,0,50,50,0,0,50,0,100,50,50,0,0,50,50,50,50,0,0,0,0,0,0,0,50].map((v,i)=>({day:i+1,value:v})),
    timeDistributionData: [
      { hour: "08-10h", value: 3 },
      { hour: "10-12h", value: 8 },
      { hour: "14-16h", value: 9 },
    ],
    monthlyConversionData: genMonthlyConversion([9800,11500,10200,9700,47820,51466,12100,9900,10450,11800,12300,4800], 7),
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "20", borderColor: "#06B6D4" },
      { label: "Ligações Atendidas", value: "2", borderColor: "#10B981" },
      { label: "Reativações", value: "1", borderColor: "#F59E0B" },
      { label: "Caixa-postal", value: "0", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "0", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "0", borderColor: "#6B7280" },
    ],
  },
  "2026-04": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "261", meta: "Mês atual", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "505", meta: "Mês atual", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "18,2%", meta: "2 ativações / 11 atendidas", color: "green" },
      { label: "Valor Total Reativado", value: "R$ 6.600", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "192", meta: "Período atual", color: "blue" },
    ],
    callsData: genTrend(alineCallsBase, 6),
    conversionData: genTrend(alineConvBase, 6),
    timeDistributionData: [
      { hour: "08-10h", value: 45 }, { hour: "10-12h", value: 62 }, { hour: "14-16h", value: 71 },
    ],
    monthlyConversionData: genMonthlyConversion([9800,11500,10200,9700,47820,51466,12100,9900,10450,11800,12300,12900], 6),
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "192", borderColor: "#06B6D4" },
      { label: "Ligações Atendidas", value: "11", borderColor: "#10B981" },
      { label: "Reativações", value: "2", borderColor: "#F59E0B" },
      { label: "Caixa-postal", value: "80", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "20", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "0", borderColor: "#6B7280" },
    ],
  },
  "2026-03": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "242", meta: "Mês atual", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "7,2 min", meta: "Meta: 5min", color: "red" },
      { label: "Total de Mensagens (Manychat)", value: "281", meta: "Mês atual", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "21,7%", meta: "5 ativações / 23 atendidas", color: "green" },
      { label: "Valor Total Reativado", value: "R$ 29.556", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "210", meta: "Período atual", color: "blue" },
    ],
    callsData: alineCallsBase.map((v, i) => ({ day: i + 1, value: v })),
    conversionData: alineConvBase.map((v, i) => ({ day: i + 1, value: v })),
    timeDistributionData: [
      { hour: "08-10h", value: 45 }, { hour: "10-12h", value: 62 }, { hour: "14-16h", value: 71 },
    ],
    monthlyConversionData: genMonthlyConversion([9800,11500,10200,9700,47820,51466,12100,9900,10450,11800,12300,12900], 5),
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "210", borderColor: "#06B6D4" },
      { label: "Ligações Atendidas", value: "23", borderColor: "#10B981" },
      { label: "Reativações", value: "5", borderColor: "#F59E0B" },
      { label: "Caixa-postal", value: "80", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "20", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "0", borderColor: "#6B7280" },
    ],
  },
  "2026-02": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Fev 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "3.3 min", meta: "Meta: 5min", color: "green" },
      { label: "Total de Mensagens (Manychat)", value: "497", meta: "Fev 2026", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "—", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "—", color: "green" },
      { label: "Total de Ligações Realizadas", value: "342", meta: "Fev 2026", color: "blue" },
    ],
    callsData: genTrend(alineCallsBase, 4),
    conversionData: genTrend(alineConvBase, 4),
    timeDistributionData: [
      { hour: "08-10h", value: 45 }, { hour: "10-12h", value: 62 }, { hour: "14-16h", value: 71 },
    ],
    monthlyConversionData: genMonthlyConversion([9800,11500,10200,9700,47820,51466,12100,9900,10450,11800,12300,12900], 4),
    additionalMetrics: [],
  },
  "2026-01": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jan 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "3.4 min", meta: "Meta: 5min", color: "green" },
      { label: "Total de Mensagens (Manychat)", value: "472", meta: "Jan 2026", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "—", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "—", color: "green" },
      { label: "Total de Ligações Realizadas", value: "338", meta: "Jan 2026", color: "blue" },
    ],
    callsData: genTrend(alineCallsBase, 3),
    conversionData: genTrend(alineConvBase, 3),
    timeDistributionData: [
      { hour: "08-10h", value: 45 }, { hour: "10-12h", value: 62 }, { hour: "14-16h", value: 71 },
    ],
    monthlyConversionData: genMonthlyConversion([9800,11500,10200,9700,47820,51466,12100,9900,10450,11800,12300,12900], 3),
    additionalMetrics: [],
  },
};

// ===== ÉVILA =====
const evilaCallsApr = [35,36,38,35,36,38,35,36,38,35,36,38,35,36,38,35,36,38,35,36,38,35,36,38,35,36,38,35,36,38];
const evilaConvApr = [13,14,15,13,14,15,13,14,15,13,14,15,13,14,15,13,14,15,13,14,15,13,14,15,13,14,15,13,14,15];
const evilaCallsFeb = [7,8,9,7,8,9,8,7,8,9,7,8,9,8,7,8,9,7,8,9,8,7,8,9,7,8,7,8];
const evilaConvFeb = [30,35,32,28,35,30,38,32,30,35,28,32,35,30,38,32,30,35,28,32,35,30,38,32,30,35,32,30];

export const evilaByMonth: Record<string, {
  kpis: { label: string; value: string; meta: string; color: "blue" | "green" | "red" | "orange" }[];
  callsData: { day: number; value: number }[];
  conversionData: { day: number; value: number }[];
  funnelData: { name: string; value: number; color: string }[];
  resultData: { name: string; value: number; fill: string }[];
  additionalMetrics: { label: string; value: string; borderColor: string }[];
}> = {
  "2026-07": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "—", meta: "Jul 2026", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "—", meta: "Jul 2026", color: "blue" },
    ],
    callsData: [],
    conversionData: [],
    funnelData: [],
    resultData: [],
    additionalMetrics: [],
  },
  "2026-06": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Valor Total Reativado", value: "—", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "—", meta: "Jun 2026", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "—", meta: "Jun 2026", color: "blue" },
    ],
    callsData: [],
    conversionData: [],
    funnelData: [],
    resultData: [],
    additionalMetrics: [],
  },
  "2026-05": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "147", meta: "Mês atual", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "204", meta: "Mês atual", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "6,3%", meta: "2 ativações / 20 atendidas", color: "blue" },
      { label: "Valor Total Reativado", value: "R$ 80", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "318", meta: "Período atual", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "180", meta: "Base de aniversariantes", color: "blue" },
    ],
    callsData: [6,0,0,0,0,0,0,0,51,0,0,50,0,0,45,44,0,0,42,62,71,58,0,0,0,51,80,43,93,44].map((v,i)=>({day:i+1,value:v})),
    conversionData: [0,0,0,0,0,0,0,0,10,0,0,10,0,0,5,5,0,0,5,10,10,5,0,0,0,5,10,5,10,5].map((v,i)=>({day:i+1,value:v})),
    funnelData: [
      { name: "Ligações Atendidas", value: 20, color: "#F59E0B" },
      { name: "Caixa-postal", value: 114, color: "#8B5CF6" },
      { name: "Inválidos", value: 9, color: "#EF4444" },
      { name: "Bloq./errado", value: 4, color: "#6B7280" },
    ],
    resultData: [
      { name: "Convertidas / interesse real (6,3%)", value: 2, fill: "#10B981" },
      { name: "Sem conversão (93,7%)", value: 18, fill: "#E5E7EB" },
    ],
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "318", borderColor: "#1B7E91" },
      { label: "Ligações Atendidas", value: "20", borderColor: "#F59E0B" },
      { label: "Reativações", value: "2", borderColor: "#10B981" },
      { label: "Aniversariantes", value: "180", borderColor: "#06B6D4" },
      { label: "Caixa-postal", value: "114", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "9", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "4", borderColor: "#6B7280" },
    ],
  },
  "2026-04": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "310", meta: "Mês atual", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "230", meta: "Mês atual", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "—", meta: "Meta: 5min", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "1,8%", meta: "1 conversão / 55 atendidas", color: "blue" },
      { label: "Valor Total Reativado", value: "R$ 360", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "532", meta: "Período atual", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "455", meta: "Base de aniversariantes", color: "blue" },
    ],
    callsData: evilaCallsApr.map((v, i) => ({ day: i + 1, value: v })),
    conversionData: evilaConvApr.map((v, i) => ({ day: i + 1, value: v })),
    funnelData: [
      { name: "Ligações Atendidas", value: 55, color: "#F59E0B" },
      { name: "Caixa-postal", value: 404, color: "#8B5CF6" },
      { name: "Inválidos", value: 40, color: "#EF4444" },
      { name: "Ocupado", value: 26, color: "#06B6D4" },
      { name: "Bloq./errado", value: 11, color: "#6B7280" },
      { name: "Não completa", value: 1, color: "#9CA3AF" },
    ],
    resultData: [
      { name: "Convertidas / interesse real (1,8%)", value: 1, fill: "#10B981" },
      { name: "Sem conversão (98,2%)", value: 54, fill: "#E5E7EB" },
    ],
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "532", borderColor: "#1B7E91" },
      { label: "Ligações Atendidas", value: "55", borderColor: "#F59E0B" },
      { label: "Reativações", value: "1", borderColor: "#10B981" },
      { label: "Aniversariantes", value: "455", borderColor: "#06B6D4" },
      { label: "Caixa-postal", value: "404", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "40", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "11", borderColor: "#6B7280" },
    ],
  },
  "2026-03": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "588", meta: "Mês atual", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "316", meta: "Mês atual", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "10.2 min", meta: "Meta: 5min", color: "red" },
      { label: "Conversão sobre Atendidas", value: "13,8%", meta: "5 reativações / 23 atendidas", color: "blue" },
      { label: "Valor Total Reativado", value: "R$ 1.200", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "1.090", meta: "Período atual", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "458", meta: "Base de aniversariantes", color: "blue" },
    ],
    callsData: evilaCallsApr.map((v, i) => ({ day: i + 1, value: v })),
    conversionData: evilaConvApr.map((v, i) => ({ day: i + 1, value: v })),
    funnelData: [
      { name: "Ligações Atendidas", value: 109, color: "#F59E0B" },
      { name: "Caixa-postal", value: 800, color: "#8B5CF6" },
      { name: "Inválidos", value: 80, color: "#EF4444" },
      { name: "Bloqueados", value: 4, color: "#6B7280" },
    ],
    resultData: [
      { name: "Convertidas / interesse real (13,8%)", value: 15, fill: "#10B981" },
      { name: "Sem conversão (86,2%)", value: 94, fill: "#E5E7EB" },
    ],
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "1.090", borderColor: "#1B7E91" },
      { label: "Ligações Atendidas", value: "109", borderColor: "#F59E0B" },
      { label: "Reativações", value: "11", borderColor: "#10B981" },
      { label: "Aniversariantes", value: "458", borderColor: "#06B6D4" },
      { label: "Caixa-postal", value: "800", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "80", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "4", borderColor: "#6B7280" },
    ],
  },
  "2026-02": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Fev 2026", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "0", meta: "Fev 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "0 min", meta: "—", color: "blue" },
      { label: "Conversão sobre Atendidas", value: "33,3%", meta: "Meta: 50%", color: "red" },
      { label: "Valor Total Reativado", value: "R$ 375", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "227", meta: "Fev 2026", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "109", meta: "Conversão: R$ 10", color: "blue" },
    ],
    callsData: evilaCallsFeb.map((v, i) => ({ day: i + 1, value: v })),
    conversionData: evilaConvFeb.map((v, i) => ({ day: i + 1, value: v })),
    funnelData: [
      { name: "Ligações Atendidas", value: 27, color: "#F59E0B" },
      { name: "Caixa-postal", value: 139, color: "#8B5CF6" },
      { name: "Inválidos", value: 36, color: "#EF4444" },
      { name: "Bloqueados", value: 2, color: "#6B7280" },
    ],
    resultData: [
      { name: "Reativadas (33,3%)", value: 9, fill: "#10B981" },
      { name: "Não convertidas (66,7%)", value: 18, fill: "#E5E7EB" },
    ],
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "227", borderColor: "#1B7E91" },
      { label: "Ligações Atendidas", value: "27", borderColor: "#F59E0B" },
      { label: "Reativações", value: "9", borderColor: "#10B981" },
      { label: "Aniversariantes", value: "109", borderColor: "#06B6D4" },
      { label: "Caixa-postal", value: "139", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "36", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "2", borderColor: "#6B7280" },
    ],
  },
  "2026-01": {
    kpis: [
      { label: "Mensagens Mensais no Chatter", value: "—", meta: "Jan 2026", color: "blue" },
      { label: "Total de Mensagens (Manychat)", value: "431", meta: "Jan 2026", color: "blue" },
      { label: "Tempo Médio de Resposta (Chat)", value: "3.7 min", meta: "Meta: 5min", color: "green" },
      { label: "Conversão sobre Atendidas", value: "62,5%", meta: "Meta: 50%", color: "green" },
      { label: "Valor Total Reativado", value: "R$ 210", meta: "Receita do mês", color: "green" },
      { label: "Total de Ligações Realizadas", value: "91", meta: "Jan 2026", color: "blue" },
      { label: "Ligações para Aniversariantes", value: "0", meta: "—", color: "blue" },
    ],
    callsData: [],
    conversionData: [],
    funnelData: [
      { name: "Ligações Atendidas", value: 8, color: "#F59E0B" },
      { name: "Caixa-postal", value: 0, color: "#8B5CF6" },
      { name: "Inválidos", value: 0, color: "#EF4444" },
      { name: "Bloqueados", value: 0, color: "#6B7280" },
    ],
    resultData: [
      { name: "Reativadas (62,5%)", value: 5, fill: "#10B981" },
      { name: "Não convertidas (37,5%)", value: 3, fill: "#E5E7EB" },
    ],
    additionalMetrics: [
      { label: "Ligações Efetuadas", value: "91", borderColor: "#1B7E91" },
      { label: "Ligações Atendidas", value: "8", borderColor: "#F59E0B" },
      { label: "Reativações", value: "5", borderColor: "#10B981" },
      { label: "Caixa-postal", value: "0", borderColor: "#8B5CF6" },
      { label: "Inválidos", value: "0", borderColor: "#EF4444" },
      { label: "Bloqueados", value: "0", borderColor: "#6B7280" },
    ],
  },
};
