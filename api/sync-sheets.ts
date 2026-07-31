// Função serverless da Vercel (não faz parte do build do Vite — roda à parte,
// em Node, quando a Vercel detecta o diretório /api na raiz do projeto).
//
// O que faz: lê 4 abas de uma planilha do Google Sheets (publicada/
// compartilhada como "Qualquer pessoa com o link pode visualizar"), via o
// endpoint público de exportação CSV do Google, e faz upsert nas mesmas 4
// tabelas do Supabase que o formulário manual e o upload de .xlsx já usam
// (strategic_kpi_reports, channel_modality_reports, donor_status_reports,
// donor_funnel_reports). O Google Sheets é o "hospedeiro" dos dados —
// Débora edita a planilha, e essa função replica pro Supabase.
//
// Pode ser chamada de duas formas:
//   1. Manualmente, pelo botão "Sincronizar do Google Sheets" em /upload.
//   2. Automaticamente, 1x por dia, pelo cron configurado em vercel.json.
//
// Variáveis de ambiente necessárias (cadastrar em Vercel > Project Settings
// > Environment Variables — ver README/VERCEL.md para o passo a passo):
//   VITE_SUPABASE_URL              (já existe — reaproveitada aqui)
//   SUPABASE_SERVICE_ROLE_KEY      (nova — Settings > API > service_role no Supabase)
//   GOOGLE_SHEET_ID                (nova — o ID que aparece na URL da planilha)
//   GOOGLE_SHEET_GID_STRATEGIC     (nova — gid da aba "Indicadores Estratégicos")
//   GOOGLE_SHEET_GID_CANAL         (nova — gid da aba "Métodos por Segmento")
//   GOOGLE_SHEET_GID_STATUS        (nova — gid da aba "Status dos Doadores")
//   GOOGLE_SHEET_GID_FUNIL         (nova — gid da aba "Jornada de Ativação")
//   SYNC_SECRET                    (opcional — se definida, exige o header
//                                   Authorization: Bearer <SYNC_SECRET> nas
//                                   chamadas manuais; o cron da Vercel usa
//                                   CRON_SECRET automaticamente se configurado)

import { createClient } from "@supabase/supabase-js";
import { getCol, readInt, readFloat, parseBRL, type SheetRow } from "../shared/sheetParsing";

// Shape mínimo do request/response da Vercel que este handler usa — evita
// depender do pacote @vercel/node só para os tipos.
interface VercelLikeRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
}

function parseCsv(text: string): SheetRow[] {
  // Parser simples de CSV com suporte a campos entre aspas (o export do
  // Google Sheets usa aspas quando o valor tem vírgula, quebra de linha etc.).
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: SheetRow = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

async function fetchSheetCsv(sheetId: string, gid: string): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar a aba (gid=${gid}): HTTP ${res.status}. Confira se a planilha está compartilhada como "Qualquer pessoa com o link — Leitor".`);
  }
  const text = await res.text();
  if (text.trim().startsWith("<")) {
    throw new Error(`A aba (gid=${gid}) não retornou CSV — provavelmente a planilha não está pública. Compartilhe como "Qualquer pessoa com o link".`);
  }
  return parseCsv(text);
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Método não permitido" });
    return;
  }

  const syncSecret = process.env.SYNC_SECRET;
  if (syncSecret) {
    const auth = req.headers?.authorization ?? "";
    if (auth !== `Bearer ${syncSecret}`) {
      res.status(401).json({ ok: false, error: "Não autorizado" });
      return;
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const gidStrategic = process.env.GOOGLE_SHEET_GID_STRATEGIC;
  const gidCanal = process.env.GOOGLE_SHEET_GID_CANAL;
  const gidStatus = process.env.GOOGLE_SHEET_GID_STATUS;
  const gidFunil = process.env.GOOGLE_SHEET_GID_FUNIL;

  const missing = [
    !supabaseUrl && "VITE_SUPABASE_URL",
    !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !sheetId && "GOOGLE_SHEET_ID",
    !gidStrategic && "GOOGLE_SHEET_GID_STRATEGIC",
    !gidCanal && "GOOGLE_SHEET_GID_CANAL",
    !gidStatus && "GOOGLE_SHEET_GID_STATUS",
    !gidFunil && "GOOGLE_SHEET_GID_FUNIL",
  ].filter(Boolean);
  if (missing.length > 0) {
    res.status(500).json({ ok: false, error: `Variáveis de ambiente faltando na Vercel: ${missing.join(", ")}` });
    return;
  }

  const supabase = createClient(supabaseUrl!, serviceRoleKey!);
  const counts = { strategic: 0, canal: 0, status: 0, funil: 0 };

  try {
    // 1) Indicadores Estratégicos
    const strategicRows = await fetchSheetCsv(sheetId!, gidStrategic!);
    for (const row of strategicRows) {
      const mes = getCol(row, "Mes", "Mês");
      if (!mes) continue;
      const { error } = await supabase.from("strategic_kpi_reports").upsert({
        mes,
        arrecadacao_ativa: parseBRL(getCol(row, "Arrecadacao Ativa", "Arrecadação Ativa")),
        doadores_ativos: readInt(row, "Doadores Ativos"),
        doadores_base: readInt(row, "Doadores Base", "Base Total"),
        doadores_cartao_recorrente: readInt(row, "Doadores Cartao Recorrente", "Doadores Cartão Recorrente"),
        doacoes_identificadas: readInt(row, "Doacoes Identificadas", "Doações Identificadas"),
        doacoes_total: readInt(row, "Doacoes Total", "Doações Total", "Doações Totais"),
        updated_at: new Date().toISOString(),
      }, { onConflict: "mes" });
      if (error) throw new Error(`strategic_kpi_reports (${mes}): ${error.message}`);
      counts.strategic++;
    }

    // 2) Métodos por Segmento (Canal x Modalidade)
    const canalRows = await fetchSheetCsv(sheetId!, gidCanal!);
    for (const row of canalRows) {
      const mes = getCol(row, "Mes", "Mês");
      const canal = getCol(row, "Canal");
      if (!mes || !canal) continue;
      const { error } = await supabase.from("channel_modality_reports").upsert({
        mes,
        canal,
        cartao_credito: readInt(row, "Cartao de Credito", "Cartão de Crédito"),
        cartao_recorrencia: readInt(row, "Cartao Recorrencia", "Cartão Recorrência"),
        boleto: readInt(row, "Boleto"),
        pix: readInt(row, "Pix"),
        updated_at: new Date().toISOString(),
      }, { onConflict: "mes, canal" });
      if (error) throw new Error(`channel_modality_reports (${mes}/${canal}): ${error.message}`);
      counts.canal++;
    }

    // 3) Status dos Doadores (%)
    const statusRows = await fetchSheetCsv(sheetId!, gidStatus!);
    for (const row of statusRows) {
      const mes = getCol(row, "Mes", "Mês");
      if (!mes) continue;
      const { error } = await supabase.from("donor_status_reports").upsert({
        mes,
        pct_ativos: readFloat(row, "Pct Ativos", "Ativos"),
        pct_inativos: readFloat(row, "Pct Inativos", "Inativos"),
        pct_cancelados: readFloat(row, "Pct Cancelados", "Cancelados"),
        updated_at: new Date().toISOString(),
      }, { onConflict: "mes" });
      if (error) throw new Error(`donor_status_reports (${mes}): ${error.message}`);
      counts.status++;
    }

    // 4) Jornada de Ativação do Doador (Funil)
    const funilRows = await fetchSheetCsv(sheetId!, gidFunil!);
    for (const row of funilRows) {
      const mes = getCol(row, "Mes", "Mês");
      if (!mes) continue;
      const { error } = await supabase.from("donor_funnel_reports").upsert({
        mes,
        cadastro_inicial: readInt(row, "Cadastro Inicial"),
        contato_realizado: readInt(row, "Contato Realizado"),
        primeiro_pagamento: readInt(row, "Primeiro Pagamento"),
        doador_ativo: readInt(row, "Doador Ativo"),
        updated_at: new Date().toISOString(),
      }, { onConflict: "mes" });
      if (error) throw new Error(`donor_funnel_reports (${mes}): ${error.message}`);
      counts.funil++;
    }

    res.status(200).json({ ok: true, counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
}
