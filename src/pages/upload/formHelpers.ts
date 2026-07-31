import { CANAIS_ORIGEM } from "@/data/strategicData";

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-07" -> "Jul 2026" */
export function fmtMes(mes: string) {
  const [ano, m] = mes.split("-");
  return `${NOMES_MES[parseInt(m) - 1]} ${ano}`;
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function calcPct(num: string, den: string): string {
  const n = parseFloat(num);
  const d = parseFloat(den);
  if (!n || !d || d === 0) return "—";
  return ((n / d) * 100).toFixed(1) + "%";
}

function getMesesDisponiveis(): { id: string; label: string }[] {
  const meses = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ id, label: fmtMes(id) });
  }
  return meses;
}

export const MESES_DISPONIVEIS = getMesesDisponiveis();
export const MES_ATUAL = MESES_DISPONIVEIS[0].id;

export const emptyChatter = () => ({ mes: MES_ATUAL, total_mensagens: "", mensagens_raqueline: "", mensagens_leticia: "", mensagens_aline: "", mensagens_evila: "", boletos_leticia: "" });
export const emptyFinancial = () => ({ mes: MES_ATUAL, cora: "", stone: "", asaas: "", receita_prevista: "" });
export const emptyEmployee = (func: string) => ({ mes: MES_ATUAL, funcionaria: func, mensagens_chatter: "", mensagens_manychat: "", tempo_resposta: "", conversao_atendidas: "", valor_reativado: "", ligacoes_realizadas: "", ligacoes_convertidas: "", ligacoes_aniversariantes: "", caixa_postal: "", bloqueados: "", invalidos: "", boletos_enviados: "", boletos_pagos: "" });
export const emptyDesfalque = () => ({ mes: MES_ATUAL, pix_ativos: "", pix_pagantes: "", boleto_ativos: "", boleto_pagantes: "", cartao_ativos: "", cartao_pagantes: "" });

// ===== Painel de Operação e Arrecadação (tabelas novas) =====
export const emptyStrategic = () => ({ mes: MES_ATUAL, arrecadacao_ativa: "", doadores_ativos: "", doadores_base: "", doadores_cartao_recorrente: "", doacoes_identificadas: "", doacoes_total: "" });
export const emptyChannelModality = () => Object.fromEntries(CANAIS_ORIGEM.map((c) => [c, { cartao_credito: "", cartao_recorrencia: "", boleto: "", pix: "" }])) as Record<string, { cartao_credito: string; cartao_recorrencia: string; boleto: string; pix: string }>;
export const emptyDonorStatus = () => ({ mes: MES_ATUAL, pct_ativos: "", pct_inativos: "", pct_cancelados: "" });
export const emptyDonorFunnel = () => ({ mes: MES_ATUAL, cadastro_inicial: "", contato_realizado: "", primeiro_pagamento: "", doador_ativo: "" });
