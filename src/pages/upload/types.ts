export type Status = "idle" | "loading" | "success" | "error";

export interface ChannelModalityRow {
  canal: string;
  cartao_credito: number | string | null;
  cartao_recorrencia: number | string | null;
  boleto: number | string | null;
  pix: number | string | null;
}

export interface EmployeeReportRow {
  funcionaria: string;
  mensagens_chatter?: number | string | null;
  mensagens_manychat?: number | string | null;
  tempo_resposta?: number | string | null;
  conversao_atendidas?: number | string | null;
  valor_reativado?: number | string | null;
  ligacoes_realizadas?: number | string | null;
  ligacoes_convertidas?: number | string | null;
  ligacoes_aniversariantes?: number | string | null;
  caixa_postal?: number | string | null;
  bloqueados?: number | string | null;
  invalidos?: number | string | null;
  boletos_enviados?: number | string | null;
  boletos_pagos?: number | string | null;
}

export interface DesfalqueRow {
  modalidade: string;
  total_ativos?: number | string | null;
  pagantes?: number | string | null;
}

export interface MonthlyReport {
  mes: string;
  receita_relacionamento: number;
  receita_real: number;
  receita_prevista_real: number;
  cadastros_ativos: number;
  updated_at: string;
}
