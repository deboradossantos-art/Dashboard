import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, RefreshCw, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Status } from "./types";
import { MESES_DISPONIVEIS } from "./formHelpers";

export const Section = ({ title, icon, color, children, defaultOpen = true }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode; defaultOpen?: boolean }) => {
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

export const MesSelect = ({ value, onChange, onLoadData }: { value: string; onChange: (v: string) => void; onLoadData?: (mes: string) => void }) => (
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

export const Field = ({ label, value, onChange, prefix, suffix, hint, money }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; hint?: string; money?: boolean }) => (
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

export const AutoField = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
    <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-sm font-bold text-success">{value}</div>
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export const SaveBtn = ({ status, onClick, label = "Salvar" }: { status: Status; onClick: () => void; label?: string }) => (
  <Button onClick={onClick} disabled={status === "loading"} className="w-full gap-2 h-11" variant={status === "success" ? "outline" : "default"}>
    {status === "loading" ? <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando...</> :
     status === "success" ? <><CheckCircle2 className="h-4 w-4 text-success" /> Salvo!</> :
     <><Save className="h-4 w-4" /> {label}</>}
  </Button>
);

/** Bloco de upload de planilha reutilizado nas 4 seções novas do Painel de Entrada. */
export const SheetUploadBox = ({ file, setFile, onProcess, status, columnsHint }: {
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
