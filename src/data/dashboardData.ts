import { MONTHS } from "./employeeData";

const GENERAL_MONTH_RAW = [
  { resp: null, vol: null, csat: null, receitaRel: 0, receitaRelPrev: 146269.60, cadastros: null, receitaPrev: null, receitaReal: 0, cancel: null, inad: null, roi: null, desfalque: [0, 0, 0], detalhe: { comprovantes: null, cora: null, stone: null } },
  { resp: null, vol: 132, csat: null, receitaRel: 11855, receitaRelPrev: 159828.77, cadastros: 5307, receitaPrev: 329775.94, receitaReal: 12250, cancel: null, inad: null, roi: null, desfalque: [0, 0, 0], detalhe: { comprovantes: 12250, cora: null, stone: null } },
  { resp: null, vol: 1897, csat: null, receitaRel: 159828.77, receitaRelPrev: 124117.28, cadastros: 5276, receitaPrev: 327214.94, receitaReal: 173223.77, cancel: null, inad: null, roi: null, desfalque: [272, 392, 3122], detalhe: { comprovantes: 173223.77, cora: null, stone: null } },
  { resp: null, vol: 1451, csat: null, receitaRel: 124117.28, receitaRelPrev: 228580.55, cadastros: 4846, receitaPrev: 295871.44, receitaReal: 103086.28, cancel: null, inad: null, roi: null, desfalque: [283, 283, 2913], detalhe: { comprovantes: 122670.28, cora: 16531, stone: 0 } },
  { resp: 12.5, vol: 1560, csat: 4.5, receitaRel: 228580.55, receitaRelPrev: 154022.46, cadastros: 3936, receitaPrev: 240390.69, receitaReal: 177720.13, cancel: 0, inad: 74.8, roi: 347.2, desfalque: [318, 216, 2877], detalhe: { comprovantes: 200027.55, cora: 28553, stone: 0 } },
  { resp: 11.7, vol: 520, csat: 4.6, receitaRel: 154022.46, receitaRelPrev: 104248.81, cadastros: 2796, receitaPrev: 161345, receitaReal: 40699.61, cancel: 231, inad: 2.91, roi: 330.6, desfalque: [131, 29, 609], detalhe: { comprovantes: null, cora: null, stone: null } },
  { resp: 11.9, vol: 639, csat: 4.4, receitaRel: 104248.81, receitaRelPrev: 10200, cadastros: 2768, receitaPrev: 161345, receitaReal: 35615.01, cancel: 224, inad: 2.76, roi: 322.8, desfalque: [110, 24, 500], detalhe: { comprovantes: null, cora: null, stone: null } },
];

function fmtBRL(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR");
}

function fmtPct(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `${v}%`;
}

export interface GeralMonthData {
  kpiCards: { label: string; value: string; meta: string; color: "red" | "green" | "blue" }[];
  cadastros: string;
  receitaPrev: string;
  receitaReal: string;
  desfalqueData: { name: string; value: number; fill: string }[];
  cancelamentos: string;
  inadimplencia: string;
  roiAtual: string;
  arrecadado: { comprovantes: string; cora: string; stone: string };
}

export const geralByMonth: Record<string, GeralMonthData> = {};
MONTHS.forEach((m, idx) => {
  const d = GENERAL_MONTH_RAW[idx];
  if (!d) return;
  const prevLabel = idx < MONTHS.length - 1 ? MONTHS[idx + 1].label : "";
  geralByMonth[m.id] = {
    kpiCards: [
      { label: "Tempo Médio de Resposta", value: d.resp !== null ? `${d.resp}` : "—", meta: "Meta: 10min", color: "red" as const },
      { label: "Volume Total Chatter", value: d.vol !== null ? fmtNum(d.vol) : "—", meta: "Mensagens no período", color: "green" as const },
      { label: "Satisfação (CSAT)", value: d.csat !== null ? `${d.csat}` : "—", meta: "Meta: 4.5", color: "blue" as const },
      { label: "Receita Mensal (Relacionamento)", value: d.receitaRel !== null ? fmtBRL(d.receitaRel) : "—", meta: prevLabel ? `${prevLabel} (comparativo): ${fmtBRL(d.receitaRelPrev)}` : "", color: "green" as const },
    ],
    cadastros: d.cadastros !== null ? fmtNum(d.cadastros) : "—",
    receitaPrev: fmtBRL(d.receitaPrev),
    receitaReal: fmtBRL(d.receitaReal),
    desfalqueData: [
      { name: "Boleto", value: d.desfalque[0], fill: "#1B7E91" },
      { name: "Cartão de Crédito", value: d.desfalque[1], fill: "#10B981" },
      { name: "Pix", value: d.desfalque[2], fill: "#F59E0B" },
    ],
    cancelamentos: d.cancel !== null ? `${d.cancel}` : "—",
    inadimplencia: d.inad !== null ? fmtPct(d.inad) : "—",
    roiAtual: d.roi !== null ? `${d.roi}%` : "—",
    arrecadado: {
      comprovantes: fmtBRL(d.detalhe.comprovantes),
      cora: fmtBRL(d.detalhe.cora),
      stone: fmtBRL(d.detalhe.stone),
    },
  };
});

export const kpiCards = geralByMonth["2026-07"]?.kpiCards ?? geralByMonth["2026-06"]?.kpiCards ?? [];

export const evolucaoReceitaData = [
  { month: "Jan 2026", value: 104248.81 },
  { month: "Fev 2026", value: 154022.46 },
  { month: "Mar 2026", value: 228580.55 },
  { month: "Abr 2026", value: 124117.28 },
  { month: "Mai 2026", value: 159828.77 },
  { month: "Jun 2026", value: 11855 },
];

function calcConversao(prev: number, real: number): number {
  if (!prev || prev <= 0) return 0;
  return Number(((real / prev) * 100).toFixed(1));
}

export const conversaoFinanceiraData = [
  { name: "Jan 2026", value: calcConversao(161345, 35615.01), fill: "#FDBA74" },
  { name: "Fev 2026", value: calcConversao(161345, 40699.61), fill: "#FB923C" },
  { name: "Mar 2026", value: calcConversao(240390.69, 177720.13), fill: "#C2410C" },
  { name: "Abr 2026", value: calcConversao(295871.44, 103086.28), fill: "#F97316" },
  { name: "Mai 2026", value: calcConversao(327214.94, 173223.77), fill: "#EA580C" },
  { name: "Jun 2026", value: calcConversao(329775.94, 12250), fill: "#FDBA74" },
];

export const resgateInativosData = [
  { name: "Cartão", value: 52 },
  { name: "Pix", value: 33 },
  { name: "Boleto", value: 15 },
];

export const recusaData = [
  { name: "Sem interesse", value: 44, fill: "#EF4444" },
  { name: "Sem recursos", value: 28, fill: "#F59E0B" },
  { name: "Outros", value: 10, fill: "#9CA3AF" },
];

export const desfalqueData = geralByMonth["2026-03"]?.desfalqueData ?? [];

export const cancellationData = [
  { name: "Dificuldades Financeiras", value: 62, fill: "#EF4444" },
  { name: "Falta de Comunicação", value: 35, fill: "#F97316" },
  { name: "Insatisfação com Serviço", value: 28, fill: "#F59E0B" },
  { name: "Mudança de Prioridades", value: 52, fill: "#FBBF24" },
  { name: "Problemas Técnicos", value: 20, fill: "#FCD34D" },
  { name: "Outros", value: 20, fill: "#FEE2E2" },
];

export const revenueData = [
  9800, 11500, 10200, 9700, 36188, 51466, 12100, 9900, 10450, 11800, 12300, 12900,
].map((v, i) => {
  const months12 = ['Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set'];
  return { month: months12[i], value: v };
});

export const roiData = [
  280, 320, 250, 380, 420, 290, 350, 310, 270, 390, 330, 347.2,
].map((v, i) => {
  const months12 = ['Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set'];
  return { month: months12[i], value: v };
});

export const revenueData6 = [
  9800, 11500, 10200, 9700, 36188, 51466,
].map((v, i) => {
  const months6 = ['Nov 2025','Dez 2025','Jan 2026','Fev 2026','Mar 2026','Abr 2026'];
  return { month: months6[i], value: v };
});

export const receitaPrevRealData = [
  { month: "Jan 2026", prevista: 161345, real: 35615.01 },
  { month: "Fev 2026", prevista: 161345, real: 40699.61 },
  { month: "Mar 2026", prevista: 240390.69, real: 177720.13 },
  { month: "Abr 2026", prevista: 295871.44, real: 103086.28 },
  { month: "Mai 2026", prevista: 327214.94, real: 173223.77 },
  { month: "Jun 2026", prevista: 329775.94, real: 12250 },
];

export const roiData6 = [
  280, 320, 250, 380, 420, 290,
].map((v, i) => {
  const months6 = ['Nov 2025','Dez 2025','Jan 2026','Fev 2026','Mar 2026','Abr 2026'];
  return { month: months6[i], value: v };
});

export const tmrData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: +(10.5 + Math.sin(i * 0.5) * 2).toFixed(1),
}));

export const fcrData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: +(78 + Math.sin(i * 0.4) * 4).toFixed(1),
}));

export const churnData = [
  3.2, 4.1, 2.8, 3.9, 5.2, 3.5, 4.3, 2.9, 3.6, 4.8, 3.1, 5.26,
].map((v, i) => ({ month: `Mês ${i + 1}`, value: v }));

export const retentionData = [
  88.5, 90.2, 87.8, 91.3, 92.1, 89.5, 90.8, 88.9, 91.6, 92.4, 90.1, 91.31,
].map((v, i) => ({ month: `Mês ${i + 1}`, value: v }));
