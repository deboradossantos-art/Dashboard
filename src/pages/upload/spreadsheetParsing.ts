import * as XLSX from "xlsx";
import { parseBRL } from "../../../shared/sheetParsing";

// Lê arquivo .xlsx binário real (usando SheetJS) e retorna no mesmo formato do parseXlsHtml
async function parseXlsxBinary(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length === 0) return { headers: [], data: [] };
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const data = rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = String((row as unknown[])[i] ?? "").trim(); });
    return obj;
  });
  return { headers, data };
}

function parseXlsHtml(content: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");
  const rows = doc.querySelectorAll("tr");
  const headers: string[] = [];
  const data: Record<string, string>[] = [];
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll("th, td");
    const values = Array.from(cells).map((c) => c.textContent?.trim() ?? "");
    if (i === 0) headers.push(...values);
    else {
      const obj: Record<string, string> = {};
      values.forEach((v, j) => { obj[headers[j]] = v; });
      data.push(obj);
    }
  });
  return { headers, data };
}

// Detecta se o arquivo é .xlsx binário real ou HTML disfarçado de .xls (relatórios do Salesforce)
export async function parseAnySpreadsheet(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Arquivos .xlsx reais começam com "PK" (assinatura ZIP)
  const isRealXlsx = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isRealXlsx) {
    return parseXlsxBinary(file);
  }
  // Relatórios do Salesforce (.xls que na verdade são HTML) vêm em ISO-8859-1 (Latin1).
  // Ler com file.text() assume UTF-8 e corrompe acentos (ç, ã, é etc). Decodificamos manualmente.
  const fullBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder("iso-8859-1");
  const text = decoder.decode(fullBuffer);
  return parseXlsHtml(text);
}

function getMesFromDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
  return "";
}

export function processOportunidades(data: Record<string, string>[]) {
  const byMes: Record<string, { total: number; real: number }> = {};
  data.forEach((row) => {
    const valor = parseBRL(row["Valor"] ?? "0");
    const atividade = row["Atividade"] ?? "";
    const mes = getMesFromDate(row["Data de fechamento"] ?? "");
    if (!mes) return;
    if (!byMes[mes]) byMes[mes] = { total: 0, real: 0 };
    byMes[mes].total += valor;
    if (atividade === "Ativo") byMes[mes].real += valor;
  });
  return byMes;
}

export function processCadastros(data: Record<string, string>[]) {
  let ativos = 0;
  let receitaPrevista = 0;
  data.forEach((row) => {
    if (row["Atividade"] === "Ativo") {
      ativos++;
      receitaPrevista += parseBRL(row["Valor Contribuição"] ?? row["Valor Contribuicao"] ?? "0");
    }
  });
  return { ativos, receitaPrevista };
}

// Classifica uma string de modalidade em Pix, Boleto ou Cartão de Crédito (ou null se não mapeada)
function classificarModalidade(raw: string): "pix" | "boleto" | "cartao" | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.includes("pix")) return "pix";
  if (v.includes("boleto") || v.includes("carnê") || v.includes("carne")) return "boleto";
  if (v.includes("cart") || v.includes("crédito") || v.includes("credito")) return "cartao";
  return null; // transferência, débito, doação única, doação não monetária etc. ficam fora
}

// Processar planilha de desfalque: 1 linha por cadastro, colunas "Modalidade" (declarada) e "Pagantes" (quem pagou e por qual modalidade)
export function processDesfalque(data: Record<string, string>[]) {
  const counts = {
    pix_ativos: 0, pix_pagantes: 0,
    boleto_ativos: 0, boleto_pagantes: 0,
    cartao_ativos: 0, cartao_pagantes: 0,
  };

  data.forEach((row) => {
    const modalidadeRaw = row["Modalidade"] ?? row["modalidade"] ?? "";
    const pagantesRaw = row["Pagantes"] ?? row["pagantes"] ?? "";

    const modalidadeTipo = classificarModalidade(modalidadeRaw);
    if (modalidadeTipo === "pix") counts.pix_ativos++;
    else if (modalidadeTipo === "boleto") counts.boleto_ativos++;
    else if (modalidadeTipo === "cartao") counts.cartao_ativos++;

    // "Pagantes" só conta se a linha realmente tiver um valor preenchido (indicando que pagou)
    if (pagantesRaw.trim()) {
      const pagouTipo = classificarModalidade(pagantesRaw);
      if (pagouTipo === "pix") counts.pix_pagantes++;
      else if (pagouTipo === "boleto") counts.boleto_pagantes++;
      else if (pagouTipo === "cartao") counts.cartao_pagantes++;
    }
  });

  return {
    pix_ativos: String(counts.pix_ativos),
    pix_pagantes: String(counts.pix_pagantes),
    boleto_ativos: String(counts.boleto_ativos),
    boleto_pagantes: String(counts.boleto_pagantes),
    cartao_ativos: String(counts.cartao_ativos),
    cartao_pagantes: String(counts.cartao_pagantes),
  };
}
