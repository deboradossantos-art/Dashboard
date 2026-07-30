import { useState, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Calendar, TrendingUp, Users2, RefreshCw, MessageSquare, Save, DollarSign, BarChart2, ChevronDown, ChevronUp, Plane, Trash2, Landmark, SlidersHorizontal, LineChart, Workflow } from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/PasswordGate";
import { logAudit } from "@/lib/useAudit";
import { CANAIS_ORIGEM } from "@/data/strategicData";

type Status = "idle" | "loading" | "success" | "error";

interface MonthlyReport {
  mes: string;
  receita_relacionamento: number;
  receita_real: number;
  receita_prevista_real: number;
  cadastros_ativos: number;
  updated_at: string;
}

// Lê arquivo .xlsx binário real (usando SheetJS) e retorna no mesmo formato do parseXlsHtml
async function parseXlsxBinary(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length === 0) return { headers: [], data: [] };
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const data = rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] ?? "").trim(); });
    return obj;
  });
  return { headers, data };
}

// Detecta se o arquivo é .xlsx binário real ou HTML disfarçado de .xls (relatórios do Salesforce)
async function parseAnySpreadsheet(file: File): Promise<{ headers: string[]; data: Record<string, string>[] }> {
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

function parseBRL(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
}

// Leitura tolerante de colunas de planilha: aceita variações de acentuação/caixa
// no cabeçalho (ex: "Mês", "mes", "MES" apontam para o mesmo campo).
function getCol(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) {
    if (row[n] !== undefined && row[n] !== "") return row[n];
  }
  const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const found = Object.keys(row).find((k) => names.some((n) => normalize(k) === normalize(n)));
  return found ? row[found] : "";
}
function readInt(row: Record<string, string>, ...names: string[]): number {
  return parseInt(getCol(row, ...names)) || 0;
}
function readFloat(row: Record<string, string>, ...names: string[]): number {
  return parseFloat(getCol(row, ...names).replace(",", ".")) || 0;
}

function getMesFromDate(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}`;
  return "";
}

function processOportunidades(data: Record<string, string>[]) {
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

function processCadastros(data: Record<string, string>[]) {
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
function processDesfalque(data: Record<string, string>[]) {
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

function fmtBRL(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMes(mes: string) {
  const [ano, m] = mes.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m) - 1]} ${ano}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function calcPct(num: string, den: string): string {
  const n = parseFloat(num);
  const d = parseFloat(den);
  if (!n || !d || d === 0) return "—";
  return ((n / d) * 100).toFixed(1) + "%";
}

function getMesLabel(mes: string): string {
  const [ano, m] = mes.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m) - 1]} ${ano}`;
}

function getMesesDisponiveis(): { id: string; label: string }[] {
  const meses = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    meses.push({ id, label: getMesLabel(id) });
  }
  return meses;
}

const MESES_DISPONIVEIS = getMesesDisponiveis();
const MES_ATUAL = MESES_DISPONIVEIS[0].id;

const emptyChatter = () => ({ mes: MES_ATUAL, total_mensagens: "", mensagens_raqueline: "", mensagens_leticia: "", mensagens_aline: "", mensagens_evila: "", boletos_leticia: "" });
const emptyFinancial = () => ({ mes: MES_ATUAL, cora: "", stone: "", asaas: "", receita_prevista: "" });
const emptyEmployee = (func: string) => ({ mes: MES_ATUAL, funcionaria: func, mensagens_chatter: "", mensagens_manychat: "", tempo_resposta: "", conversao_atendidas: "", valor_reativado: "", ligacoes_realizadas: "", ligacoes_convertidas: "", ligacoes_aniversariantes: "", caixa_postal: "", bloqueados: "", invalidos: "", boletos_enviados: "", boletos_pagos: "" });
const emptyDesfalque = () => ({ mes: MES_ATUAL, pix_ativos: "", pix_pagantes: "", boleto_ativos: "", boleto_pagantes: "", cartao_ativos: "", cartao_pagantes: "" });

// ===== Painel de Operação e Arrecadação (tabelas novas) =====
const emptyStrategic = () => ({ mes: MES_ATUAL, arrecadacao_ativa: "", doadores_ativos: "", doadores_base: "", doadores_cartao_recorrente: "", doacoes_identificadas: "", doacoes_total: "" });
const emptyChannelModality = () => Object.fromEntries(CANAIS_ORIGEM.map((c) => [c, { cartao_credito: "", cartao_recorrencia: "", boleto: "", pix: "" }])) as Record<string, { cartao_credito: string; cartao_recorrencia: string; boleto: string; pix: string }>;
const emptyDonorStatus = () => ({ mes: MES_ATUAL, pct_ativos: "", pct_inativos: "", pct_cancelados: "" });
const emptyDonorFunnel = () => ({ mes: MES_ATUAL, cadastro_inicial: "", contato_realizado: "", primeiro_pagamento: "", doador_ativo: "" });

const Section = ({ title, icon, color, children, defaultOpen = true }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}>{icon}</div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6 space-y-4">{children}</div>}
    </div>
  );
};

const MesSelect = ({ value, onChange, onLoadData }: { value: string; onChange: (v: string) => void; onLoadData?: (mes: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mês de referência</label>
    <select
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        onLoadData?.(e.target.value);
      }}
      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {MESES_DISPONIVEIS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  </div>
);

const Field = ({ label, value, onChange, prefix, suffix, hint, money }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; hint?: string; money?: boolean }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-sm text-muted-foreground">{prefix}</span>}
      {money ? (
        <input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={(e) => {
            // Aceita apenas dígitos, ponto (milhar) e vírgula (decimal) — formato BR,
            // já que <input type="number"> força ponto como separador decimal e
            // transformava "21.084" em 21,084 em vez de R$ 21.084.
            const cleaned = e.target.value.replace(/[^0-9.,]/g, "");
            onChange(cleaned);
          }}
          className={`w-full rounded-lg border border-border bg-background py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors ${prefix ? "pl-8 pr-3" : suffix ? "pl-3 pr-10" : "px-3"}`}
        />
      ) : (
        <input
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border border-border bg-background py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors ${prefix ? "pl-8 pr-3" : suffix ? "pl-3 pr-10" : "px-3"}`}
        />
      )}
      {suffix && <span className="absolute right-3 text-sm text-muted-foreground">{suffix}</span>}
    </div>
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const AutoField = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm font-bold text-success">{value}</div>
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const SaveBtn = ({ status, onClick, label = "Salvar" }: { status: Status; onClick: () => void; label?: string }) => (
  <Button onClick={onClick} disabled={status === "loading"} className="w-full gap-2 h-11" variant={status === "success" ? "outline" : "default"}>
    {status === "loading" ? <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando...</> :
     status === "success" ? <><CheckCircle2 className="h-4 w-4 text-success" /> Salvo!</> :
     <><Save className="h-4 w-4" /> {label}</>}
  </Button>
);

/** Bloco de upload de planilha reutilizado nas 4 seções novas do Painel de Entrada. */
const SheetUploadBox = ({ file, setFile, onProcess, status, columnsHint }: {
  file: File | null;
  setFile: (f: File | null) => void;
  onProcess: () => void;
  status: Status;
  /** Ex.: "Mes, Arrecadacao Ativa, Doadores Ativos, ..." */
  columnsHint: string;
}) => (
  <div className="rounded-xl border-2 border-dashed border-border p-4 space-y-3">
    <div className="flex items-center gap-2">
      <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
      <p className="text-xs font-semibold text-foreground">Preencher via planilha (.xlsx)</p>
    </div>
    <p className="text-[11px] text-muted-foreground">
      Uma linha por mês, colunas: <strong>{columnsHint}</strong>. Pode ter vários meses na mesma planilha.
    </p>
    <div className="flex flex-col sm:flex-row gap-2">
      <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors text-sm ${file ? "border-primary/50 bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
        <Upload className="h-4 w-4" />
        <span className="truncate">{file ? file.name : "Selecionar planilha (.xlsx)"}</span>
        <input type="file" accept=".xls,.xlsx,.html,.htm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <Button onClick={onProcess} disabled={!file || status === "loading"} className="gap-2 h-auto sm:h-auto px-4">
        {status === "loading" ? <RefreshCw className="h-4 w-4 animate-spin" /> :
         status === "success" ? <CheckCircle2 className="h-4 w-4" /> :
         <FileSpreadsheet className="h-4 w-4" />}
        Processar
      </Button>
    </div>
  </div>
);

export default function UploadPage() {
  // Antes essa página só liberava pro e-mail da Débora — restrição removida
  // a pedido dela: agora qualquer um dos e-mails já autorizados no login
  // (PasswordGate) pode importar relatórios, sem checagem extra aqui.
  const { user } = useAuth();

  const [oportunidadesFile, setOportunidadesFile] = useState<File | null>(null);
  const [cadastrosFile, setCadastrosFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Status>("idle");
  const [historico, setHistorico] = useState<MonthlyReport[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  const [chatter, setChatter] = useState(emptyChatter());
  const [chatterStatus, setChatterStatus] = useState<Status>("idle");

  const [financial, setFinancial] = useState(emptyFinancial());
  const [financialStatus, setFinancialStatus] = useState<Status>("idle");

  const [raqueline, setRaqueline] = useState(emptyEmployee("raqueline"));
  const [raquelineStatus, setRaquelineStatus] = useState<Status>("idle");

  const [leticia, setLeticia] = useState(emptyEmployee("leticia"));
  const [leticiaStatus, setLeticiaStatus] = useState<Status>("idle");

  const [aline, setAline] = useState(emptyEmployee("aline"));
  const [alineStatus, setAlineStatus] = useState<Status>("idle");

  const [evila, setEvila] = useState(emptyEmployee("evila"));
  const [evilaStatus, setEvilaStatus] = useState<Status>("idle");

  const [vacations, setVacations] = useState<{ id: string; funcionaria: string; data_inicio: string; data_fim: string; observacao: string | null }[]>([]);
  const [loadingVacations, setLoadingVacations] = useState(true);
  const [novaFerias, setNovaFerias] = useState({ funcionaria: "raqueline", data_inicio: "", data_fim: "", observacao: "" });
  const [feriasStatus, setFeriasStatus] = useState<Status>("idle");

  const [desfalque, setDesfalque] = useState(emptyDesfalque());
  const [desfalqueStatus, setDesfalqueStatus] = useState<Status>("idle");
  const [desfalqueFile, setDesfalqueFile] = useState<File | null>(null);
  const [desfalqueUploadStatus, setDesfalqueUploadStatus] = useState<Status>("idle");

  // ===== Painel de Operação e Arrecadação (tabelas novas) =====
  const [strategic, setStrategic] = useState(emptyStrategic());
  const [strategicStatus, setStrategicStatus] = useState<Status>("idle");
  const [strategicFile, setStrategicFile] = useState<File | null>(null);
  const [strategicUploadStatus, setStrategicUploadStatus] = useState<Status>("idle");

  const [channelModality, setChannelModality] = useState(emptyChannelModality());
  const [channelModalityMes, setChannelModalityMes] = useState(MES_ATUAL);
  const [channelModalityStatus, setChannelModalityStatus] = useState<Status>("idle");
  const [channelModalityFile, setChannelModalityFile] = useState<File | null>(null);
  const [channelModalityUploadStatus, setChannelModalityUploadStatus] = useState<Status>("idle");

  const [donorStatus, setDonorStatus] = useState(emptyDonorStatus());
  const [donorStatusStatus, setDonorStatusStatus] = useState<Status>("idle");
  const [donorStatusFile, setDonorStatusFile] = useState<File | null>(null);
  const [donorStatusUploadStatus, setDonorStatusUploadStatus] = useState<Status>("idle");

  const [donorFunnel, setDonorFunnel] = useState(emptyDonorFunnel());
  const [donorFunnelStatus, setDonorFunnelStatus] = useState<Status>("idle");
  const [donorFunnelFile, setDonorFunnelFile] = useState<File | null>(null);
  const [donorFunnelUploadStatus, setDonorFunnelUploadStatus] = useState<Status>("idle");

  const [syncSheetsStatus, setSyncSheetsStatus] = useState<Status>("idle");

  const [loadingFormData, setLoadingFormData] = useState(false);

  const loadSavedData = async (mes: string) => {
    setLoadingFormData(true);
    try {
      const [{ data: chatterData }, { data: financialData }, { data: employeeData }, { data: desfalqueData }] = await Promise.all([
        supabase.from("chatter_reports").select("*").eq("mes", mes).single(),
        supabase.from("financial_reports").select("*").eq("mes", mes).single(),
        supabase.from("employee_reports").select("*").eq("mes", mes),
        supabase.from("desfalque_reports").select("*").eq("mes", mes),
      ]);

      // As 4 tabelas do Painel de Operação e Arrecadação são consultadas à
      // parte, com catch próprio: se ainda não existirem no Supabase, isso
      // não pode derrubar o carregamento dos dados que já funcionam acima.
      const [strategicRes, donorStatusRes, donorFunnelRes, channelModalityRes] = await Promise.all([
        supabase.from("strategic_kpi_reports").select("*").eq("mes", mes).maybeSingle(),
        supabase.from("donor_status_reports").select("*").eq("mes", mes).maybeSingle(),
        supabase.from("donor_funnel_reports").select("*").eq("mes", mes).maybeSingle(),
        supabase.from("channel_modality_reports").select("*").eq("mes", mes),
      ]).catch(() => [{ data: null }, { data: null }, { data: null }, { data: null }] as any[]);

      const strategicData = strategicRes?.data;
      if (strategicData) {
        setStrategic({
          mes,
          arrecadacao_ativa: String(strategicData.arrecadacao_ativa ?? ""),
          doadores_ativos: String(strategicData.doadores_ativos ?? ""),
          doadores_base: String(strategicData.doadores_base ?? ""),
          doadores_cartao_recorrente: String(strategicData.doadores_cartao_recorrente ?? ""),
          doacoes_identificadas: String(strategicData.doacoes_identificadas ?? ""),
          doacoes_total: String(strategicData.doacoes_total ?? ""),
        });
      } else {
        setStrategic({ ...emptyStrategic(), mes });
      }

      const donorStatusData = donorStatusRes?.data;
      setDonorStatus(donorStatusData
        ? { mes, pct_ativos: String(donorStatusData.pct_ativos ?? ""), pct_inativos: String(donorStatusData.pct_inativos ?? ""), pct_cancelados: String(donorStatusData.pct_cancelados ?? "") }
        : { ...emptyDonorStatus(), mes });

      const donorFunnelData = donorFunnelRes?.data;
      setDonorFunnel(donorFunnelData
        ? { mes, cadastro_inicial: String(donorFunnelData.cadastro_inicial ?? ""), contato_realizado: String(donorFunnelData.contato_realizado ?? ""), primeiro_pagamento: String(donorFunnelData.primeiro_pagamento ?? ""), doador_ativo: String(donorFunnelData.doador_ativo ?? "") }
        : { ...emptyDonorFunnel(), mes });

      const channelRows: any[] = channelModalityRes?.data ?? [];
      const nextChannelModality = emptyChannelModality();
      channelRows.forEach((row) => {
        if (nextChannelModality[row.canal]) {
          nextChannelModality[row.canal] = {
            cartao_credito: String(row.cartao_credito ?? ""),
            cartao_recorrencia: String(row.cartao_recorrencia ?? ""),
            boleto: String(row.boleto ?? ""),
            pix: String(row.pix ?? ""),
          };
        }
      });
      setChannelModality(nextChannelModality);
      setChannelModalityMes(mes);

      if (chatterData) {
        setChatter({
          mes,
          total_mensagens: String(chatterData.total_mensagens || ""),
          mensagens_raqueline: String(chatterData.mensagens_raqueline || ""),
          mensagens_leticia: String(chatterData.mensagens_leticia || ""),
          mensagens_aline: String(chatterData.mensagens_aline || ""),
          mensagens_evila: String(chatterData.mensagens_evila || ""),
          boletos_leticia: String(chatterData.boletos_leticia || ""),
        });
      } else {
        setChatter({ ...emptyChatter(), mes });
      }

      if (financialData) {
        setFinancial({
          mes,
          cora: String(financialData.cora || ""),
          stone: String(financialData.stone || ""),
          asaas: String(financialData.asaas || ""),
          receita_prevista: String(financialData.receita_prevista || ""),
        });
      } else {
        setFinancial({ ...emptyFinancial(), mes });
      }

      const loadEmployee = (funcId: string, setter: (v: ReturnType<typeof emptyEmployee>) => void) => {
        const d = employeeData?.find((e: any) => e.funcionaria === funcId);
        if (d) {
          setter({
            mes,
            funcionaria: funcId,
            mensagens_chatter: String(d.mensagens_chatter || ""),
            mensagens_manychat: String(d.mensagens_manychat || ""),
            tempo_resposta: String(d.tempo_resposta || ""),
            conversao_atendidas: String(d.conversao_atendidas || ""),
            valor_reativado: String(d.valor_reativado || ""),
            ligacoes_realizadas: String(d.ligacoes_realizadas || ""),
            ligacoes_convertidas: String(d.ligacoes_convertidas || ""),
            ligacoes_aniversariantes: String(d.ligacoes_aniversariantes || ""),
            caixa_postal: String(d.caixa_postal || ""),
            bloqueados: String(d.bloqueados || ""),
            invalidos: String(d.invalidos || ""),
            boletos_enviados: String(d.boletos_enviados || ""),
            boletos_pagos: String(d.boletos_pagos || ""),
          });
        } else {
          setter({ ...emptyEmployee(funcId), mes });
        }
      };
      loadEmployee("raqueline", setRaqueline);
      loadEmployee("leticia", setLeticia);
      loadEmployee("aline", setAline);
      loadEmployee("evila", setEvila);

      if (desfalqueData && desfalqueData.length > 0) {
        const pix = desfalqueData.find((d: any) => d.modalidade === "Pix");
        const boleto = desfalqueData.find((d: any) => d.modalidade === "Boleto");
        const cartao = desfalqueData.find((d: any) => d.modalidade === "Cartão de Crédito");
        setDesfalque({
          mes,
          pix_ativos: String(pix?.total_ativos || ""),
          pix_pagantes: String(pix?.pagantes || ""),
          boleto_ativos: String(boleto?.total_ativos || ""),
          boleto_pagantes: String(boleto?.pagantes || ""),
          cartao_ativos: String(cartao?.total_ativos || ""),
          cartao_pagantes: String(cartao?.pagantes || ""),
        });
      } else {
        setDesfalque({ ...emptyDesfalque(), mes });
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoadingFormData(false);
    }
  };

  useEffect(() => {
    loadSavedData(MES_ATUAL);
  }, []);

  const fetchHistorico = async () => {
    setLoadingHistorico(true);
    const { data } = await supabase.from("monthly_reports").select("*").order("mes", { ascending: false });
    setHistorico(data ?? []);
    setLoadingHistorico(false);
  };

  useEffect(() => { fetchHistorico(); }, []);

  const fetchVacations = async () => {
    setLoadingVacations(true);
    const { data } = await supabase.from("employee_vacations").select("*").order("data_inicio", { ascending: false });
    setVacations(data ?? []);
    setLoadingVacations(false);
  };

  useEffect(() => { fetchVacations(); }, []);

  const handleAddFerias = () => saveWithStatus(setFeriasStatus, async () => {
    if (!novaFerias.data_inicio || !novaFerias.data_fim) {
      throw new Error("Preencha a data de início e fim das férias");
    }
    const { error } = await supabase.from("employee_vacations").insert({
      funcionaria: novaFerias.funcionaria,
      data_inicio: novaFerias.data_inicio,
      data_fim: novaFerias.data_fim,
      observacao: novaFerias.observacao || null,
    });
    if (error) throw error;
    toast({ title: "Período de férias registrado!" });
    logAudit(user.email!, "Férias registradas", `${novaFerias.funcionaria}: ${novaFerias.data_inicio} a ${novaFerias.data_fim}`);
    setNovaFerias({ funcionaria: novaFerias.funcionaria, data_inicio: "", data_fim: "", observacao: "" });
    fetchVacations();
  });

  const handleDeleteFerias = async (id: string) => {
    const { error } = await supabase.from("employee_vacations").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: String(error.message), variant: "destructive" });
      return;
    }
    toast({ title: "Período removido" });
    fetchVacations();
  };

  const saveWithStatus = async (setStatus: (s: Status) => void, fn: () => Promise<void>) => {
    setStatus("loading");
    try {
      await fn();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      toast({ title: "Erro ao salvar", description: String(err), variant: "destructive" });
    }
  };

  const handleUpload = async () => {
    if (!oportunidadesFile) { toast({ title: "Selecione o relatório de oportunidades", variant: "destructive" }); return; }
    setUploadStatus("loading");
    try {
      const { data: oData } = await parseAnySpreadsheet(oportunidadesFile);
      const byMes = processOportunidades(oData);
      let cadastrosAtivos: number | undefined;
      let receitaPrevista: number | undefined;
      if (cadastrosFile) {
        const { data: cData } = await parseAnySpreadsheet(cadastrosFile);
        const resultCadastros = processCadastros(cData);
        cadastrosAtivos = resultCadastros.ativos;
        receitaPrevista = resultCadastros.receitaPrevista;
      }
      for (const [mes, valores] of Object.entries(byMes)) {
        const payload: any = {
          mes,
          receita_relacionamento: valores.total,
          receita_real: valores.real,
          updated_at: new Date().toISOString(),
        };
        if (cadastrosAtivos !== undefined) payload.cadastros_ativos = cadastrosAtivos;
        if (receitaPrevista !== undefined) payload.receita_prevista_real = receitaPrevista;
        const { error } = await supabase.from("monthly_reports").upsert(payload, { onConflict: "mes" });
        if (error) throw error;
      }
      setUploadStatus("success");
      setOportunidadesFile(null);
      setCadastrosFile(null);
      toast({ title: "Relatórios processados com sucesso!" });
      logAudit(user.email!, "Relatórios importados", `Oportunidades e cadastros importados para: ${Object.keys(byMes).join(", ")}`);
      fetchHistorico();
      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch (err) {
      setUploadStatus("error");
      toast({ title: "Erro ao processar", description: String(err), variant: "destructive" });
    }
  };

  const handleChatter = () => saveWithStatus(setChatterStatus, async () => {
    const { error } = await supabase.from("chatter_reports").upsert({
      mes: chatter.mes,
      total_mensagens: parseInt(chatter.total_mensagens) || 0,
      mensagens_raqueline: parseInt(chatter.mensagens_raqueline) || 0,
      mensagens_leticia: parseInt(chatter.mensagens_leticia) || 0,
      mensagens_aline: parseInt(chatter.mensagens_aline) || 0,
      mensagens_evila: parseInt(chatter.mensagens_evila) || 0,
      boletos_leticia: parseInt(chatter.boletos_leticia) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "mes" });
    if (error) throw error;
    toast({ title: `Chatter de ${fmtMes(chatter.mes)} salvo!` });
    logAudit(user.email!, "Chatter salvo", `Mês: ${fmtMes(chatter.mes)}`);
  });

  const handleFinancial = () => saveWithStatus(setFinancialStatus, async () => {
    const { error } = await supabase.from("financial_reports").upsert({
      mes: financial.mes,
      cora: parseBRL(financial.cora),
      stone: parseBRL(financial.stone),
      asaas: parseBRL(financial.asaas),
      receita_prevista: parseBRL(financial.receita_prevista),
      updated_at: new Date().toISOString(),
    }, { onConflict: "mes" });
    if (error) throw error;
    toast({ title: `Financeiro de ${fmtMes(financial.mes)} salvo!` });
    logAudit(user.email!, "Financeiro salvo", `Mês: ${fmtMes(financial.mes)} — Cora/Stone/Asaas`);
  });

  const handleEmployee = (data: ReturnType<typeof emptyEmployee>, setStatus: (s: Status) => void) => saveWithStatus(setStatus, async () => {
    const conversao = calcPct(data.ligacoes_convertidas, data.ligacoes_realizadas);
    const { error } = await supabase.from("employee_reports").upsert({
      mes: data.mes,
      funcionaria: data.funcionaria,
      mensagens_chatter: parseInt(data.mensagens_chatter) || 0,
      mensagens_manychat: parseInt(data.mensagens_manychat) || 0,
      tempo_resposta: parseFloat(data.tempo_resposta) || 0,
      conversao_atendidas: conversao === "—" ? 0 : parseFloat(conversao),
      valor_reativado: parseBRL(data.valor_reativado),
      ligacoes_realizadas: parseInt(data.ligacoes_realizadas) || 0,
      ligacoes_convertidas: parseInt(data.ligacoes_convertidas) || 0,
      ligacoes_aniversariantes: parseInt(data.ligacoes_aniversariantes) || 0,
      caixa_postal: parseInt(data.caixa_postal) || 0,
      bloqueados: parseInt(data.bloqueados) || 0,
      invalidos: parseInt(data.invalidos) || 0,
      boletos_enviados: parseInt(data.boletos_enviados) || 0,
      boletos_pagos: parseInt(data.boletos_pagos) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "mes, funcionaria" });
    if (error) throw error;
    toast({ title: `Dados de ${data.funcionaria} em ${fmtMes(data.mes)} salvos!` });
    logAudit(user.email!, "Dados de funcionária salvos", `Funcionária: ${data.funcionaria} — Mês: ${fmtMes(data.mes)}`);
  });

  const handleDesfalque = () => saveWithStatus(setDesfalqueStatus, async () => {
    const modalidades = [
      { modalidade: "Pix", total_ativos: parseInt(desfalque.pix_ativos) || 0, pagantes: parseInt(desfalque.pix_pagantes) || 0 },
      { modalidade: "Boleto", total_ativos: parseInt(desfalque.boleto_ativos) || 0, pagantes: parseInt(desfalque.boleto_pagantes) || 0 },
      { modalidade: "Cartão de Crédito", total_ativos: parseInt(desfalque.cartao_ativos) || 0, pagantes: parseInt(desfalque.cartao_pagantes) || 0 },
    ];
    for (const m of modalidades) {
      const { error } = await supabase.from("desfalque_reports").upsert({ mes: desfalque.mes, ...m, updated_at: new Date().toISOString() }, { onConflict: "mes, modalidade" });
      if (error) throw error;
    }
    toast({ title: `Desfalque de ${fmtMes(desfalque.mes)} salvo!` });
    logAudit(user.email!, "Desfalque salvo", `Mês: ${fmtMes(desfalque.mes)}`);
  });

  // ===== Painel de Operação e Arrecadação (handlers de salvar) =====
  const handleStrategic = () => saveWithStatus(setStrategicStatus, async () => {
    const { error } = await supabase.from("strategic_kpi_reports").upsert({
      mes: strategic.mes,
      arrecadacao_ativa: parseBRL(strategic.arrecadacao_ativa),
      doadores_ativos: parseInt(strategic.doadores_ativos) || 0,
      doadores_base: parseInt(strategic.doadores_base) || 0,
      doadores_cartao_recorrente: parseInt(strategic.doadores_cartao_recorrente) || 0,
      doacoes_identificadas: parseInt(strategic.doacoes_identificadas) || 0,
      doacoes_total: parseInt(strategic.doacoes_total) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "mes" });
    if (error) throw error;
    toast({ title: `Indicadores estratégicos de ${fmtMes(strategic.mes)} salvos!` });
    logAudit(user.email!, "Indicadores estratégicos salvos", `Mês: ${fmtMes(strategic.mes)}`);
  });

  const handleDonorStatus = () => saveWithStatus(setDonorStatusStatus, async () => {
    const { error } = await supabase.from("donor_status_reports").upsert({
      mes: donorStatus.mes,
      pct_ativos: parseFloat(donorStatus.pct_ativos) || 0,
      pct_inativos: parseFloat(donorStatus.pct_inativos) || 0,
      pct_cancelados: parseFloat(donorStatus.pct_cancelados) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "mes" });
    if (error) throw error;
    toast({ title: `Status dos doadores de ${fmtMes(donorStatus.mes)} salvo!` });
    logAudit(user.email!, "Status dos doadores salvo", `Mês: ${fmtMes(donorStatus.mes)}`);
  });

  const handleDonorFunnel = () => saveWithStatus(setDonorFunnelStatus, async () => {
    const { error } = await supabase.from("donor_funnel_reports").upsert({
      mes: donorFunnel.mes,
      cadastro_inicial: parseInt(donorFunnel.cadastro_inicial) || 0,
      contato_realizado: parseInt(donorFunnel.contato_realizado) || 0,
      primeiro_pagamento: parseInt(donorFunnel.primeiro_pagamento) || 0,
      doador_ativo: parseInt(donorFunnel.doador_ativo) || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "mes" });
    if (error) throw error;
    toast({ title: `Funil de ativação de ${fmtMes(donorFunnel.mes)} salvo!` });
    logAudit(user.email!, "Funil de ativação salvo", `Mês: ${fmtMes(donorFunnel.mes)}`);
  });

  const handleChannelModality = () => saveWithStatus(setChannelModalityStatus, async () => {
    for (const canal of CANAIS_ORIGEM) {
      const v = channelModality[canal];
      const { error } = await supabase.from("channel_modality_reports").upsert({
        mes: channelModalityMes,
        canal,
        cartao_credito: parseInt(v.cartao_credito) || 0,
        cartao_recorrencia: parseInt(v.cartao_recorrencia) || 0,
        boleto: parseInt(v.boleto) || 0,
        pix: parseInt(v.pix) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "mes, canal" });
      if (error) throw error;
    }
    toast({ title: `Métodos por segmento de ${fmtMes(channelModalityMes)} salvos!` });
    logAudit(user.email!, "Métodos por segmento salvos", `Mês: ${fmtMes(channelModalityMes)}`);
  });

  // ===== Painel de Operação e Arrecadação — upload de planilha =====
  // As 4 planilhas abaixo são um formato próprio (não vêm de nenhum sistema
  // externo como o Salesforce): uma linha por mês (ou por mês+canal, no caso
  // de Métodos por Segmento), com cabeçalhos em português. Cada upload
  // processa quantas linhas/meses vierem na planilha de uma vez — ao
  // contrário do formulário manual, que só edita o mês selecionado.

  const handleStrategicUpload = async () => {
    if (!strategicFile) { toast({ title: "Selecione a planilha de indicadores estratégicos", variant: "destructive" }); return; }
    setStrategicUploadStatus("loading");
    try {
      const { data } = await parseAnySpreadsheet(strategicFile);
      let count = 0;
      for (const row of data) {
        const mes = getCol(row, "Mes", "Mês");
        if (!mes) continue;
        const { error } = await supabase.from("strategic_kpi_reports").upsert({
          mes,
          arrecadacao_ativa: parseBRL(getCol(row, "Arrecadacao Ativa", "Arrecadação Ativa")),
          doadores_ativos: readInt(row, "Doadores Ativos"),
          doadores_base: readInt(row, "Doadores Base", "Base Total"),
          doadores_cartao_recorrente: readInt(row, "Doadores Cartao Recorrente", "Doadores Cartão Recorrente"),
          doacoes_identificadas: readInt(row, "Doacoes Identificadas", "Doações Identificadas"),
          doacoes_total: readInt(row, "Doacoes Total", "Doações Totais", "Doações Total"),
          updated_at: new Date().toISOString(),
        }, { onConflict: "mes" });
        if (error) throw error;
        count++;
      }
      if (count === 0) throw new Error('Nenhuma linha com coluna "Mes" preenchida foi encontrada na planilha.');
      setStrategicUploadStatus("success");
      setStrategicFile(null);
      toast({ title: `${count} mês(es) de Indicadores Estratégicos importado(s)!` });
      logAudit(user.email!, "Indicadores estratégicos importados via planilha", `${count} mês(es)`);
      loadSavedData(strategic.mes);
      setTimeout(() => setStrategicUploadStatus("idle"), 3000);
    } catch (err) {
      setStrategicUploadStatus("error");
      toast({ title: "Erro ao processar planilha", description: String(err), variant: "destructive" });
    }
  };

  const handleChannelModalityUpload = async () => {
    if (!channelModalityFile) { toast({ title: "Selecione a planilha de métodos por segmento", variant: "destructive" }); return; }
    setChannelModalityUploadStatus("loading");
    try {
      const { data } = await parseAnySpreadsheet(channelModalityFile);
      let count = 0;
      for (const row of data) {
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
        if (error) throw error;
        count++;
      }
      if (count === 0) throw new Error('Nenhuma linha com colunas "Mes" e "Canal" preenchidas foi encontrada na planilha.');
      setChannelModalityUploadStatus("success");
      setChannelModalityFile(null);
      toast({ title: `${count} linha(s) de Métodos por Segmento importada(s)!` });
      logAudit(user.email!, "Métodos por segmento importados via planilha", `${count} linha(s)`);
      loadSavedData(channelModalityMes);
      setTimeout(() => setChannelModalityUploadStatus("idle"), 3000);
    } catch (err) {
      setChannelModalityUploadStatus("error");
      toast({ title: "Erro ao processar planilha", description: String(err), variant: "destructive" });
    }
  };

  const handleDonorStatusUpload = async () => {
    if (!donorStatusFile) { toast({ title: "Selecione a planilha de status dos doadores", variant: "destructive" }); return; }
    setDonorStatusUploadStatus("loading");
    try {
      const { data } = await parseAnySpreadsheet(donorStatusFile);
      let count = 0;
      for (const row of data) {
        const mes = getCol(row, "Mes", "Mês");
        if (!mes) continue;
        const { error } = await supabase.from("donor_status_reports").upsert({
          mes,
          pct_ativos: readFloat(row, "Pct Ativos", "Ativos", "Ativos (%)"),
          pct_inativos: readFloat(row, "Pct Inativos", "Inativos", "Inativos (%)"),
          pct_cancelados: readFloat(row, "Pct Cancelados", "Cancelados", "Cancelados (%)"),
          updated_at: new Date().toISOString(),
        }, { onConflict: "mes" });
        if (error) throw error;
        count++;
      }
      if (count === 0) throw new Error('Nenhuma linha com coluna "Mes" preenchida foi encontrada na planilha.');
      setDonorStatusUploadStatus("success");
      setDonorStatusFile(null);
      toast({ title: `${count} mês(es) de Status dos Doadores importado(s)!` });
      logAudit(user.email!, "Status dos doadores importado via planilha", `${count} mês(es)`);
      loadSavedData(donorStatus.mes);
      setTimeout(() => setDonorStatusUploadStatus("idle"), 3000);
    } catch (err) {
      setDonorStatusUploadStatus("error");
      toast({ title: "Erro ao processar planilha", description: String(err), variant: "destructive" });
    }
  };

  const handleDonorFunnelUpload = async () => {
    if (!donorFunnelFile) { toast({ title: "Selecione a planilha do funil de ativação", variant: "destructive" }); return; }
    setDonorFunnelUploadStatus("loading");
    try {
      const { data } = await parseAnySpreadsheet(donorFunnelFile);
      let count = 0;
      for (const row of data) {
        const mes = getCol(row, "Mes", "Mês");
        if (!mes) continue;
        const { error } = await supabase.from("donor_funnel_reports").upsert({
          mes,
          cadastro_inicial: readInt(row, "Cadastro Inicial"),
          contato_realizado: readInt(row, "Contato Realizado"),
          primeiro_pagamento: readInt(row, "Primeiro Pagamento"),
          doador_ativo: readInt(row, "Doador Ativo", "Doador Ativo Recorrente"),
          updated_at: new Date().toISOString(),
        }, { onConflict: "mes" });
        if (error) throw error;
        count++;
      }
      if (count === 0) throw new Error('Nenhuma linha com coluna "Mes" preenchida foi encontrada na planilha.');
      setDonorFunnelUploadStatus("success");
      setDonorFunnelFile(null);
      toast({ title: `${count} mês(es) do Funil de Ativação importado(s)!` });
      logAudit(user.email!, "Funil de ativação importado via planilha", `${count} mês(es)`);
      loadSavedData(donorFunnel.mes);
      setTimeout(() => setDonorFunnelUploadStatus("idle"), 3000);
    } catch (err) {
      setDonorFunnelUploadStatus("error");
      toast({ title: "Erro ao processar planilha", description: String(err), variant: "destructive" });
    }
  };

  // Chama a função serverless /api/sync-sheets (ver api/sync-sheets.ts), que
  // lê as 4 abas do Google Sheets e faz upsert direto no Supabase.
  // Se VITE_SYNC_SECRET estiver definida (mesmo valor de SYNC_SECRET na
  // Vercel), manda junto no header Authorization — sem isso, se o backend
  // tiver SYNC_SECRET configurada, essa chamada manual seria recusada (401).
  const handleSyncSheets = async () => {
    setSyncSheetsStatus("loading");
    try {
      const syncSecret = import.meta.env.VITE_SYNC_SECRET as string | undefined;
      const res = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: syncSecret ? { Authorization: `Bearer ${syncSecret}` } : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSyncSheetsStatus("success");
      const { strategic: nS, canal: nC, status: nSt, funil: nF } = json.counts ?? {};
      toast({ title: "Sincronizado com o Google Sheets!", description: `${nS ?? 0} mês(es) estratégicos · ${nC ?? 0} linha(s) de canal · ${nSt ?? 0} mês(es) de status · ${nF ?? 0} mês(es) de funil.` });
      logAudit(user.email!, "Sincronizado com Google Sheets", JSON.stringify(json.counts ?? {}));
      loadSavedData(strategic.mes);
      setTimeout(() => setSyncSheetsStatus("idle"), 3000);
    } catch (err) {
      setSyncSheetsStatus("error");
      toast({ title: "Erro ao sincronizar com o Google Sheets", description: String(err), variant: "destructive" });
    }
  };

  const handleDesfalqueUpload = async () => {
    if (!desfalqueFile) { toast({ title: "Selecione a planilha de desfalque", variant: "destructive" }); return; }
    setDesfalqueUploadStatus("loading");
    try {
      const { data } = await parseAnySpreadsheet(desfalqueFile);
      const result = processDesfalque(data);
      setDesfalque((p) => ({ ...p, ...result }));
      setDesfalqueUploadStatus("success");
      setDesfalqueFile(null);
      toast({ title: "Planilha de desfalque processada!", description: "Confira os valores abaixo e clique em Salvar Desfalque." });
      setTimeout(() => setDesfalqueUploadStatus("idle"), 3000);
    } catch (err) {
      setDesfalqueUploadStatus("error");
      toast({ title: "Erro ao processar planilha", description: String(err), variant: "destructive" });
    }
  };

  const FuncForm = ({ label, data, setData, status, setStatus, showAniv = false, simples = false }: {
    label: string;
    data: ReturnType<typeof emptyEmployee>;
    setData: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyEmployee>>>;
    status: Status;
    setStatus: (s: Status) => void;
    showAniv?: boolean;
    /** Letícia usa um formulário reduzido: chatter + boletos, em vez de ligações/manychat. */
    simples?: boolean;
  }) => {
    const conversao = calcPct(data.ligacoes_convertidas, data.ligacoes_realizadas);
    const taxaBoletosLocal = calcPct(data.boletos_pagos, data.boletos_enviados);
    return (
      <Section title={`Funcionária — ${label}`} icon={<Users2 className="h-4 w-4" />} color="bg-info/10 text-info" defaultOpen={false}>
        <MesSelect value={data.mes} onChange={(v) => setData(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />
        {simples ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Mensagens no Chatter" value={data.mensagens_chatter} onChange={(v) => setData(p => ({ ...p, mensagens_chatter: v }))} />
            <Field label="Boletos Enviados" value={data.boletos_enviados} onChange={(v) => setData(p => ({ ...p, boletos_enviados: v }))} />
            <Field label="Boletos Pagos" value={data.boletos_pagos} onChange={(v) => setData(p => ({ ...p, boletos_pagos: v }))} />
            <AutoField label="Taxa de Boletos Pagos" value={taxaBoletosLocal} hint="Calculado: pagos ÷ enviados" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Mensagens no Chatter" value={data.mensagens_chatter} onChange={(v) => setData(p => ({ ...p, mensagens_chatter: v }))} />
            <Field label="Total Mensagens (Manychat)" value={data.mensagens_manychat} onChange={(v) => setData(p => ({ ...p, mensagens_manychat: v }))} />
            <Field label="Tempo Médio de Resposta" value={data.tempo_resposta} onChange={(v) => setData(p => ({ ...p, tempo_resposta: v }))} suffix="min" />
            <Field label="Total de Ligações Realizadas" value={data.ligacoes_realizadas} onChange={(v) => setData(p => ({ ...p, ligacoes_realizadas: v }))} />
            <Field label="Ligações Convertidas" value={data.ligacoes_convertidas} onChange={(v) => setData(p => ({ ...p, ligacoes_convertidas: v }))} hint="Usado para calcular a conversão" />
            <AutoField label="Conversão sobre Atendidas" value={conversao} hint="Calculado: convertidas ÷ realizadas" />
            <Field label="Valor Total Reativado (R$)" value={data.valor_reativado} onChange={(v) => setData(p => ({ ...p, valor_reativado: v }))} prefix="R$" money />
            {showAniv && <Field label="Ligações para Aniversariantes" value={data.ligacoes_aniversariantes} onChange={(v) => setData(p => ({ ...p, ligacoes_aniversariantes: v }))} />}
            <Field label="Caixa Postal" value={data.caixa_postal} onChange={(v) => setData(p => ({ ...p, caixa_postal: v }))} />
            <Field label="Bloqueados" value={data.bloqueados} onChange={(v) => setData(p => ({ ...p, bloqueados: v }))} />
            <Field label="Inválidos" value={data.invalidos} onChange={(v) => setData(p => ({ ...p, invalidos: v }))} />
          </div>
        )}
        <SaveBtn status={status} onClick={() => handleEmployee(data, setStatus)} label={`Salvar ${label}`} />
      </Section>
    );
  };

  const FUNCIONARIAS = [
    { label: "Raqueline", data: raqueline, setData: setRaqueline, status: raquelineStatus, setStatus: setRaquelineStatus, showAniv: false, simples: false },
    { label: "Letícia", data: leticia, setData: setLeticia, status: leticiaStatus, setStatus: setLeticiaStatus, showAniv: false, simples: true },
    { label: "Aline", data: aline, setData: setAline, status: alineStatus, setStatus: setAlineStatus, showAniv: false, simples: false },
    { label: "Évila", data: evila, setData: setEvila, status: evilaStatus, setStatus: setEvilaStatus, showAniv: true, simples: false },
  ];

  const header = (
    <div className="px-4 sm:px-6 lg:px-10 py-5 flex items-center gap-4 max-w-[1500px] mx-auto">
      <Button variant="ghost" size="icon" asChild className="shrink-0">
        <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
      </Button>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          <span className="text-gradient-primary">Importar Relatórios</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Atualize todos os dados do dashboard aqui
          {loadingFormData && <span className="ml-2 inline-flex items-center gap-1 text-primary"><RefreshCw className="h-3 w-3 animate-spin" /> carregando dados...</span>}
        </p>
      </div>
    </div>
  );

  return (
    <AppShell header={header}>
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="entrada" className="space-y-6">
          <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
            <TabsTrigger value="entrada" className="gap-1.5"><Landmark className="h-3.5 w-3.5" /> Painel de Entrada</TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
            <TabsTrigger value="equipe" className="gap-1.5"><Users2 className="h-3.5 w-3.5" /> Equipe</TabsTrigger>
            <TabsTrigger value="desfalque" className="gap-1.5"><BarChart2 className="h-3.5 w-3.5" /> Desfalque</TabsTrigger>
          </TabsList>

          {/* ===== Painel de Entrada: as 4 tabelas do painel Lumen ===== */}
          <TabsContent value="entrada" className="space-y-4 mt-0">
            <p className="text-xs text-muted-foreground px-1">
              Alimenta os 4 KPIs e os 3 gráficos do topo do dashboard ("Painel de Operação e Arrecadação"). Enquanto uma seção aqui não for salva pelo menos uma vez, o cartão/gráfico correspondente aparece como "aguardando dados".
            </p>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" /> Google Sheets é o hospedeiro destes dados
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Edite a planilha normalmente. Este botão puxa as 4 abas e atualiza o Supabase agora — também roda sozinho 1x por dia.
                </p>
              </div>
              <Button onClick={handleSyncSheets} disabled={syncSheetsStatus === "loading"} variant="outline" className="gap-2 shrink-0">
                {syncSheetsStatus === "loading" ? <RefreshCw className="h-4 w-4 animate-spin" /> :
                 syncSheetsStatus === "success" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                 <RefreshCw className="h-4 w-4" />}
                Sincronizar do Google Sheets
              </Button>
            </div>

            <Section title="Indicadores Estratégicos" icon={<Landmark className="h-4 w-4" />} color="bg-primary/10 text-primary">
              <MesSelect value={strategic.mes} onChange={(v) => setStrategic(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />
              <p className="text-[11px] text-muted-foreground">Alimenta: Arrecadação Ativa, Taxa de Ativação Geral, Taxa de Recorrência no Cartão e Índice de Conciliação.</p>
              <SheetUploadBox
                file={strategicFile}
                setFile={setStrategicFile}
                onProcess={handleStrategicUpload}
                status={strategicUploadStatus}
                columnsHint="Mes, Arrecadacao Ativa, Doadores Ativos, Doadores Base, Doadores Cartao Recorrente, Doacoes Identificadas, Doacoes Total"
              />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Ou preencha manualmente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Arrecadação Ativa (R$)" value={strategic.arrecadacao_ativa} onChange={(v) => setStrategic(p => ({ ...p, arrecadacao_ativa: v }))} prefix="R$" money />
                <Field label="Doadores Ativos (qtd)" value={strategic.doadores_ativos} onChange={(v) => setStrategic(p => ({ ...p, doadores_ativos: v }))} hint="Usado em Ativação e Recorrência" />
                <Field label="Base Total (qtd)" value={strategic.doadores_base} onChange={(v) => setStrategic(p => ({ ...p, doadores_base: v }))} hint="Ativos + inativos + cancelados" />
                <Field label="Doadores em Cartão Recorrente (qtd)" value={strategic.doadores_cartao_recorrente} onChange={(v) => setStrategic(p => ({ ...p, doadores_cartao_recorrente: v }))} />
                <Field label="Doações Identificadas (qtd)" value={strategic.doacoes_identificadas} onChange={(v) => setStrategic(p => ({ ...p, doacoes_identificadas: v }))} hint="Conciliadas no período" />
                <Field label="Doações Totais (qtd)" value={strategic.doacoes_total} onChange={(v) => setStrategic(p => ({ ...p, doacoes_total: v }))} />
              </div>
              <SaveBtn status={strategicStatus} onClick={handleStrategic} label="Salvar Indicadores Estratégicos" />
            </Section>

            <Section title="Métodos por Segmento (Canal x Modalidade)" icon={<SlidersHorizontal className="h-4 w-4" />} color="bg-warning/10 text-warning" defaultOpen={false}>
              <MesSelect value={channelModalityMes} onChange={setChannelModalityMes} onLoadData={loadSavedData} />
              <p className="text-[11px] text-muted-foreground">Alimenta o gráfico de barras lado a lado — quantidade de doadores por canal e modalidade.</p>
              <SheetUploadBox
                file={channelModalityFile}
                setFile={setChannelModalityFile}
                onProcess={handleChannelModalityUpload}
                status={channelModalityUploadStatus}
                columnsHint="Mes, Canal, Cartao, Boleto, Pix, TED (uma linha por canal, por mês)"
              />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Ou preencha manualmente</p>
              {CANAIS_ORIGEM.map((canal) => (
                <div key={canal} className="rounded-xl border border-border p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">{canal}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Field label="Cartão de Crédito" value={channelModality[canal].cartao_credito} onChange={(v) => setChannelModality(p => ({ ...p, [canal]: { ...p[canal], cartao_credito: v } }))} />
                    <Field label="Cartão Recorrência" value={channelModality[canal].cartao_recorrencia} onChange={(v) => setChannelModality(p => ({ ...p, [canal]: { ...p[canal], cartao_recorrencia: v } }))} />
                    <Field label="Boleto" value={channelModality[canal].boleto} onChange={(v) => setChannelModality(p => ({ ...p, [canal]: { ...p[canal], boleto: v } }))} />
                    <Field label="Pix" value={channelModality[canal].pix} onChange={(v) => setChannelModality(p => ({ ...p, [canal]: { ...p[canal], pix: v } }))} />
                  </div>
                </div>
              ))}
              <SaveBtn status={channelModalityStatus} onClick={handleChannelModality} label="Salvar Métodos por Segmento" />
            </Section>

            <Section title="Status dos Doadores (%)" icon={<LineChart className="h-4 w-4" />} color="bg-success/10 text-success" defaultOpen={false}>
              <MesSelect value={donorStatus.mes} onChange={(v) => setDonorStatus(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />
              <p className="text-[11px] text-muted-foreground">Alimenta o gráfico Ativos vs. Inativos vs. Cancelados. Cancelado = informou que não quer mais doar OU não respondeu 5 tentativas de contato.</p>
              <SheetUploadBox
                file={donorStatusFile}
                setFile={setDonorStatusFile}
                onProcess={handleDonorStatusUpload}
                status={donorStatusUploadStatus}
                columnsHint="Mes, Pct Ativos, Pct Inativos, Pct Cancelados"
              />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Ou preencha manualmente</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Ativos (%)" value={donorStatus.pct_ativos} onChange={(v) => setDonorStatus(p => ({ ...p, pct_ativos: v }))} suffix="%" />
                <Field label="Inativos (%)" value={donorStatus.pct_inativos} onChange={(v) => setDonorStatus(p => ({ ...p, pct_inativos: v }))} suffix="%" hint="Sem doar há 1-3 meses" />
                <Field label="Cancelados (%)" value={donorStatus.pct_cancelados} onChange={(v) => setDonorStatus(p => ({ ...p, pct_cancelados: v }))} suffix="%" />
              </div>
              <SaveBtn status={donorStatusStatus} onClick={handleDonorStatus} label="Salvar Status dos Doadores" />
            </Section>

            <Section title="Jornada de Ativação do Doador (Funil)" icon={<Workflow className="h-4 w-4" />} color="bg-info/10 text-info" defaultOpen={false}>
              <MesSelect value={donorFunnel.mes} onChange={(v) => setDonorFunnel(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />
              <p className="text-[11px] text-muted-foreground">Alimenta o funil: vai até o Doador Ativo (recorrente), não só o 1º pagamento.</p>
              <SheetUploadBox
                file={donorFunnelFile}
                setFile={setDonorFunnelFile}
                onProcess={handleDonorFunnelUpload}
                status={donorFunnelUploadStatus}
                columnsHint="Mes, Cadastro Inicial, Contato Realizado, Primeiro Pagamento, Doador Ativo"
              />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Ou preencha manualmente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Cadastro Inicial (qtd)" value={donorFunnel.cadastro_inicial} onChange={(v) => setDonorFunnel(p => ({ ...p, cadastro_inicial: v }))} />
                <Field label="Contato Realizado (qtd)" value={donorFunnel.contato_realizado} onChange={(v) => setDonorFunnel(p => ({ ...p, contato_realizado: v }))} />
                <Field label="Primeiro Pagamento (qtd)" value={donorFunnel.primeiro_pagamento} onChange={(v) => setDonorFunnel(p => ({ ...p, primeiro_pagamento: v }))} />
                <Field label="Doador Ativo / Recorrente (qtd)" value={donorFunnel.doador_ativo} onChange={(v) => setDonorFunnel(p => ({ ...p, doador_ativo: v }))} />
              </div>
              <SaveBtn status={donorFunnelStatus} onClick={handleDonorFunnel} label="Salvar Funil de Ativação" />
            </Section>
          </TabsContent>

          {/* ===== Financeiro ===== */}
          <TabsContent value="financeiro" className="space-y-4 mt-0">

        {/* Histórico */}
        <Section title="Meses importados" icon={<Calendar className="h-4 w-4" />} color="bg-info/10 text-info">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Histórico de relatórios salvos</p>
            <button onClick={fetchHistorico} className="text-muted-foreground hover:text-foreground p-1">
              <RefreshCw className={`h-4 w-4 ${loadingHistorico ? "animate-spin" : ""}`} />
            </button>
          </div>
          {loadingHistorico ? (
            <div className="h-12 rounded-lg bg-muted/50 animate-pulse" />
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum relatório importado ainda.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {historico.map((r) => (
                  <div key={r.mes} className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1.5">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span className="text-sm font-semibold text-foreground">{fmtMes(r.mes)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Mês</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Rec. Total</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Receita Real</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Receita Prevista</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Cadastros Ativos</th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((r, i) => (
                      <tr key={r.mes} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-4 py-3 font-semibold text-foreground">{fmtMes(r.mes)}</td>
                        <td className="px-4 py-3 text-right">{fmtBRL(r.receita_relacionamento)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-success">{fmtBRL(r.receita_real)}</td>
                        <td className="px-4 py-3 text-right text-primary">{r.receita_prevista_real ? fmtBRL(r.receita_prevista_real) : "—"}</td>
                        <td className="px-4 py-3 text-right">{r.cadastros_ativos?.toLocaleString("pt-BR") ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{fmtDate(r.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>

        {/* Upload Salesforce */}
        <Section title="Relatórios do Salesforce" icon={<TrendingUp className="h-4 w-4" />} color="bg-primary/10 text-primary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Oportunidades", hint: "Valor + Data de fechamento + Atividade", file: oportunidadesFile, setFile: setOportunidadesFile },
              { label: "Cadastros (opcional)", hint: "Atividade + Valor Contribuição", file: cadastrosFile, setFile: setCadastrosFile },
            ].map(({ label, hint, file, setFile }) => (
              <label key={label} className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${file ? "border-success/50 bg-success/5" : "border-border hover:border-muted-foreground/40"}`}>
                {file ? (
                  <><CheckCircle2 className="h-8 w-8 text-success mb-2" /><span className="text-sm font-medium text-center break-all">{file.name}</span><span className="text-xs text-muted-foreground mt-1">Clique para trocar</span></>
                ) : (
                  <><FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-2" /><span className="text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground mt-1">{hint}</span></>
                )}
                <input type="file" accept=".xls,.xlsx,.html,.htm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            ))}
          </div>
          <Button onClick={handleUpload} disabled={!oportunidadesFile || uploadStatus === "loading"} className="w-full gap-2 bg-gradient-primary text-primary-foreground h-11">
            {uploadStatus === "loading" ? <><RefreshCw className="h-4 w-4 animate-spin" /> Processando...</> :
             uploadStatus === "success" ? <><CheckCircle2 className="h-4 w-4" /> Salvo!</> :
             <><Upload className="h-4 w-4" /> Processar e Salvar</>}
          </Button>
        </Section>

        {/* Financeiro */}
        <Section title="Financeiro — Cora, Stone e Asaas" icon={<DollarSign className="h-4 w-4" />} color="bg-success/10 text-success" defaultOpen={false}>
          <MesSelect value={financial.mes} onChange={(v) => setFinancial(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Cora (R$)" value={financial.cora} onChange={(v) => setFinancial(p => ({ ...p, cora: v }))} prefix="R$" money />
            <Field label="Stone (R$)" value={financial.stone} onChange={(v) => setFinancial(p => ({ ...p, stone: v }))} prefix="R$" money />
            <Field label="Asaas (R$)" value={financial.asaas} onChange={(v) => setFinancial(p => ({ ...p, asaas: v }))} prefix="R$" money />
            <Field label="Receita Prevista (R$)" value={financial.receita_prevista} onChange={(v) => setFinancial(p => ({ ...p, receita_prevista: v }))} prefix="R$" hint="Meta mensal baseada nos cadastros ativos" money />
          </div>
          <SaveBtn status={financialStatus} onClick={handleFinancial} label="Salvar Financeiro" />
        </Section>
          </TabsContent>

          {/* ===== Equipe ===== */}
          <TabsContent value="equipe" className="space-y-4 mt-0">

        {/* Chatter */}
        <Section title="Chatter — Volume de Mensagens" icon={<MessageSquare className="h-4 w-4" />} color="bg-warning/10 text-warning" defaultOpen={false}>
          <MesSelect value={chatter.mes} onChange={(v) => setChatter(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Field label="Total de mensagens no mês" value={chatter.total_mensagens} onChange={(v) => setChatter(p => ({ ...p, total_mensagens: v }))} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por funcionária</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Raqueline" value={chatter.mensagens_raqueline} onChange={(v) => setChatter(p => ({ ...p, mensagens_raqueline: v }))} />
              <Field label="Letícia" value={chatter.mensagens_leticia} onChange={(v) => setChatter(p => ({ ...p, mensagens_leticia: v }))} />
              <Field label="Aline" value={chatter.mensagens_aline} onChange={(v) => setChatter(p => ({ ...p, mensagens_aline: v }))} />
              <Field label="Évila" value={chatter.mensagens_evila} onChange={(v) => setChatter(p => ({ ...p, mensagens_evila: v }))} />
            </div>
          </div>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
            <Field label="Boletos enviados pela Letícia" value={chatter.boletos_leticia} onChange={(v) => setChatter(p => ({ ...p, boletos_leticia: v }))} hint='Mensagens com "boleto" no body' />
          </div>
          <SaveBtn status={chatterStatus} onClick={handleChatter} label="Salvar Chatter" />
        </Section>

        {/* Férias */}
        <Section title="Férias das Funcionárias" icon={<Plane className="h-4 w-4" />} color="bg-info/10 text-info" defaultOpen={false}>
          <p className="text-xs text-muted-foreground">Registre períodos de férias. Os números do mês continuam aparecendo normalmente, com um aviso do período.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funcionária</label>
              <select
                value={novaFerias.funcionaria}
                onChange={(e) => setNovaFerias((p) => ({ ...p, funcionaria: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="raqueline">Raqueline</option>
                <option value="leticia">Letícia</option>
                <option value="aline">Aline</option>
                <option value="evila">Évila</option>
              </select>
            </div>
            <div />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Início das férias</label>
              <input
                type="date"
                value={novaFerias.data_inicio}
                onChange={(e) => setNovaFerias((p) => ({ ...p, data_inicio: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fim das férias</label>
              <input
                type="date"
                value={novaFerias.data_fim}
                onChange={(e) => setNovaFerias((p) => ({ ...p, data_fim: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <Field label="Observação (opcional)" value={novaFerias.observacao} onChange={(v) => setNovaFerias((p) => ({ ...p, observacao: v }))} hint="Ex: férias parciais, licença, etc." />

          <SaveBtn status={feriasStatus} onClick={handleAddFerias} label="Registrar Férias" />

          {loadingVacations ? (
            <div className="h-12 rounded-lg bg-muted/50 animate-pulse" />
          ) : vacations.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Períodos registrados</p>
              {vacations.map((v) => {
                const labels: Record<string, string> = { raqueline: "Raqueline", leticia: "Letícia", aline: "Aline", evila: "Évila" };
                const fmtDateBR = (d: string) => {
                  const [ano, mes, dia] = d.split("-");
                  return `${dia}/${mes}/${ano}`;
                };
                return (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{labels[v.funcionaria] ?? v.funcionaria}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateBR(v.data_inicio)} até {fmtDateBR(v.data_fim)}{v.observacao ? ` · ${v.observacao}` : ""}</p>
                    </div>
                    <button onClick={() => handleDeleteFerias(v.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Funcionárias */}
        {FUNCIONARIAS.map((f) => (
          <FuncForm key={f.label} label={f.label} data={f.data} setData={f.setData} status={f.status} setStatus={f.setStatus} showAniv={f.showAniv} simples={f.simples} />
        ))}
          </TabsContent>

          {/* ===== Desfalque ===== */}
          <TabsContent value="desfalque" className="space-y-4 mt-0">
            <Section title="Desfalque por Modalidade" icon={<BarChart2 className="h-4 w-4" />} color="bg-destructive/10 text-destructive">
              <MesSelect value={desfalque.mes} onChange={(v) => setDesfalque(p => ({ ...p, mes: v }))} onLoadData={loadSavedData} />

              {/* Upload de planilha */}
              <div className="rounded-xl border-2 border-dashed border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">Preencher automaticamente via planilha</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Planilha do Salesforce com 1 linha por cadastro ativo: coluna <strong>Modalidade</strong> (modalidade cadastrada) e coluna <strong>Pagantes</strong> (preenchida só quando o cadastro pagou naquele mês, com a modalidade do pagamento).
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors text-sm ${desfalqueFile ? "border-primary/50 bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
                    <Upload className="h-4 w-4" />
                    <span className="truncate">{desfalqueFile ? desfalqueFile.name : "Selecionar planilha (.xls)"}</span>
                    <input type="file" accept=".xls,.xlsx,.html,.htm" className="hidden" onChange={(e) => setDesfalqueFile(e.target.files?.[0] ?? null)} />
                  </label>
                  <Button onClick={handleDesfalqueUpload} disabled={!desfalqueFile || desfalqueUploadStatus === "loading"} className="gap-2 h-auto sm:h-auto px-4">
                    {desfalqueUploadStatus === "loading" ? <RefreshCw className="h-4 w-4 animate-spin" /> :
                     desfalqueUploadStatus === "success" ? <CheckCircle2 className="h-4 w-4" /> :
                     <FileSpreadsheet className="h-4 w-4" />}
                    Processar
                  </Button>
                </div>
              </div>

              {(parseInt(desfalque.pix_ativos) || parseInt(desfalque.boleto_ativos) || parseInt(desfalque.cartao_ativos)) > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado processado</p>
                  {[
                    { label: "Pix", ativosKey: "pix_ativos" as const, pagantesKey: "pix_pagantes" as const },
                    { label: "Boleto", ativosKey: "boleto_ativos" as const, pagantesKey: "boleto_pagantes" as const },
                    { label: "Cartão de Crédito", ativosKey: "cartao_ativos" as const, pagantesKey: "cartao_pagantes" as const },
                  ].map(({ label, ativosKey, pagantesKey }) => {
                    const ativos = parseInt(desfalque[ativosKey]) || 0;
                    const pagantes = parseInt(desfalque[pagantesKey]) || 0;
                    const desf = ativos - pagantes;
                    const pct = ativos > 0 ? ((desf / ativos) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={label} className="rounded-xl border border-border p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{ativos.toLocaleString("pt-BR")} ativos · {pagantes.toLocaleString("pt-BR")} pagantes</p>
                        </div>
                        {ativos > 0 && <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full whitespace-nowrap">{pct}% desfalque ({desf.toLocaleString("pt-BR")})</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              <SaveBtn status={desfalqueStatus} onClick={handleDesfalque} label="Salvar Desfalque" />
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
