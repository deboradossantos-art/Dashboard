/**
 * Utilitários de leitura tolerante de planilhas (Google Sheets CSV, .xlsx,
 * relatórios HTML do Salesforce), compartilhados entre o bundle do Vite
 * (`src/pages/Upload.tsx`) e a função serverless da Vercel (`api/sync-sheets.ts`).
 * Fica fora de `src/` e `api/` de propósito: os dois runtimes (browser e
 * Node) importam este arquivo por caminho relativo, sem depender um do
 * outro nem do alias `@/` (que só existe no bundle do Vite).
 */

export type SheetRow = Record<string, string>;

/** Aceita variações de acentuação/caixa no cabeçalho (ex: "Mês", "mes", "MES" apontam para o mesmo campo). */
export function getCol(row: SheetRow, ...names: string[]): string {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== "") return row[n];
  }
  const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const found = Object.keys(row).find((k) => names.some((n) => normalize(k) === normalize(n)));
  return found ? row[found] : "";
}

export function readInt(row: SheetRow, ...names: string[]): number {
  return parseInt(getCol(row, ...names)) || 0;
}

export function readFloat(row: SheetRow, ...names: string[]): number {
  return parseFloat(getCol(row, ...names).replace(",", ".")) || 0;
}

/** "1.234,56" -> 1234.56 */
export function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}
