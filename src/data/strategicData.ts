/**
 * Camada de dados do "Painel de Operação e Arrecadação" (bloco de entrada do
 * dashboard, no padrão visual Lumen — navy + dourado).
 *
 * As 4 tabelas abaixo (strategic_kpi_reports, channel_modality_reports,
 * donor_status_reports, donor_funnel_reports) AINDA NÃO EXISTEM no Supabase.
 * Débora vai criá-las. Até lá, todo valor cai em `null`/"—" — seguindo o
 * mesmo princípio já usado no resto do app (ver Index.tsx: "melhor mostrar
 * nada do que um número inventado"). Nada aqui é dado de exemplo fingindo
 * ser real.
 *
 * Esquema sugerido para as tabelas (ajuste os nomes de coluna se preferir
 * outros, e atualize os tipos abaixo de acordo):
 *
 * strategic_kpi_reports
 *   mes text                        -- "2026-07"
 *   arrecadacao_ativa numeric       -- R$ arrecadação ativa total do mês
 *   doadores_ativos integer         -- qtd de doadores ativos
 *   doadores_base integer           -- qtd total da base (ativos + inativos + cancelados)
 *   doadores_cartao_recorrente integer -- qtd de doadores ativos que pagam via cartão recorrente
 *   doacoes_identificadas integer   -- qtd de doações conciliadas/identificadas no período
 *   doacoes_total integer           -- qtd total de doações recebidas no período
 *
 * channel_modality_reports
 *   mes text
 *   canal text                      -- "Café Inspirador" | "Comunhão de Bens" | "Doação Pontual" | "Missas" | "Pequenas Empresas"
 *   cartao_credito integer
 *   cartao_recorrencia integer
 *   boleto integer
 *   pix integer
 *
 * donor_status_reports
 *   mes text
 *   pct_ativos numeric              -- % da base em status ativo
 *   pct_inativos numeric            -- % sem doar há 1-3 meses (pré-cancelamento)
 *   pct_cancelados numeric          -- % cancelados (não quer mais doar OU 5 tentativas sem resposta)
 *
 * donor_funnel_reports
 *   mes text
 *   cadastro_inicial integer
 *   contato_realizado integer
 *   primeiro_pagamento integer
 *   doador_ativo integer            -- recorrente (o novo passo final da proposta de funil)
 */

export interface StrategicKpiReport {
  mes: string;
  arrecadacao_ativa: number | null;
  doadores_ativos: number | null;
  doadores_base: number | null;
  doadores_cartao_recorrente: number | null;
  doacoes_identificadas: number | null;
  doacoes_total: number | null;
}

export interface ChannelModalityReport {
  mes: string;
  canal: string;
  cartao_credito: number | null;
  cartao_recorrencia: number | null;
  boleto: number | null;
  pix: number | null;
}

export interface DonorStatusReport {
  mes: string;
  pct_ativos: number | null;
  pct_inativos: number | null;
  pct_cancelados: number | null;
}

export interface DonorFunnelReport {
  mes: string;
  cadastro_inicial: number | null;
  contato_realizado: number | null;
  primeiro_pagamento: number | null;
  doador_ativo: number | null;
}

const presente = (v: number | null | undefined): number | null =>
  v != null && Number.isFinite(v) && v > 0 ? v : null;

export function fmtBRLOrDash(v: number | null | undefined): string {
  const p = presente(v);
  if (p === null) return "—";
  return `R$ ${p.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPctOrDash(v: number | null, decimals = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}%`;
}

/** Taxa de Ativação Geral (%) = qtd de ativos / qtd da base. */
export function calcTaxaAtivacao(report: StrategicKpiReport | null | undefined): number | null {
  const ativos = presente(report?.doadores_ativos);
  const base = presente(report?.doadores_base);
  if (ativos === null || base === null) return null;
  return (ativos / base) * 100;
}

/** Taxa de Recorrência no Cartão (%) = doadores em cartão recorrente / doadores ativos. */
export function calcTaxaRecorrenciaCartao(report: StrategicKpiReport | null | undefined): number | null {
  const cartao = presente(report?.doadores_cartao_recorrente);
  const ativos = presente(report?.doadores_ativos);
  if (cartao === null || ativos === null) return null;
  return (cartao / ativos) * 100;
}

/** Índice de Conciliação (%) = doações identificadas / total de doações. Meta: >95%. */
export function calcIndiceConciliacao(report: StrategicKpiReport | null | undefined): number | null {
  const identificadas = presente(report?.doacoes_identificadas);
  const total = presente(report?.doacoes_total);
  if (identificadas === null || total === null) return null;
  return (identificadas / total) * 100;
}

export function calcDeltaPct(current: number | null, prev: number | null): number | null {
  if (current === null || prev === null || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

// Canais de origem — valores reais usados no cadastro (formulário, planilha,
// linhas do Supabase), em ordem alfabética. "Membros Ser Feliz" não é
// cadastrado diretamente: ele existe só como agrupamento de "Missas" e
// "Café Inspirador" no filtro (ver CANAL_GRUPOS abaixo), já que essas são as
// duas classificações mais importantes dentro dele.
export const CANAIS_ORIGEM = [
  "Café Inspirador",
  "Comunhão de Bens",
  "Doação Pontual",
  "Missas",
  "Pequenas Empresas",
] as const;
// Agrupamento pro filtro "Canal de Origem": a maioria dos grupos tem 1
// canal só, mas "Membros Ser Feliz" agrupa 2 (Missas e Café Inspirador) —
// marcar o grupo seleciona os dois juntos; dá pra expandir e marcar cada um
// separado também. Em ordem alfabética pelo rótulo do grupo.
export const CANAL_GRUPOS: { label: string; canais: readonly string[] }[] = [
  { label: "Comunhão de Bens", canais: ["Comunhão de Bens"] },
  { label: "Doação Pontual", canais: ["Doação Pontual"] },
  { label: "Membros Ser Feliz", canais: ["Café Inspirador", "Missas"] },
  { label: "Pequenas Empresas", canais: ["Pequenas Empresas"] },
];
// Modalidades novas (substituem Cartão/Boleto/Pix/TED) — "Cartão" foi
// desmembrado em Crédito e Recorrência, e TED saiu da lista. Ordem alfabética.
export const MODALIDADES = ["Boleto", "Cartão de Crédito", "Cartão Recorrência", "Pix"] as const;
// Paleta restrita a navy + dourado (tons derivados), pra bater com a
// identidade visual do dashboard — sem verde/azul soltos. Usa valores HSL
// fixos (não var(--primary)) porque --primary vira dourado no modo escuro,
// o que faria duas modalidades ficarem da mesma cor.
export const MODALIDADE_COLORS: Record<string, string> = {
  Boleto: "hsl(46 76% 57%)",
  "Cartão de Crédito": "hsl(217 89% 14%)",
  "Cartão Recorrência": "hsl(217 55% 42%)",
  Pix: "hsl(46 60% 55%)",
};
