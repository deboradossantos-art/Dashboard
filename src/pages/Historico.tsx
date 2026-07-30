import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Shield, Clock, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/PasswordGate";

// Email do admin, configurado via env var (VITE_ADMIN_EMAIL) — evita PII no repo.
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? "";

interface AuditEntry {
  id: string;
  user_email: string;
  action: string;
  details: string | null;
  created_at: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

const actionColor: Record<string, string> = {
  "Acesso ao dashboard": "bg-info/10 text-info border-info/30",
  "Relatórios importados": "bg-success/10 text-success border-success/30",
  "Chatter salvo": "bg-warning/10 text-warning border-warning/30",
  "Financeiro salvo": "bg-primary/10 text-primary border-primary/30",
  "Desfalque salvo": "bg-destructive/10 text-destructive border-destructive/30",
};

const getActionColor = (action: string) => {
  for (const [key, color] of Object.entries(actionColor)) {
    if (action.includes(key)) return color;
  }
  return "bg-muted/50 text-muted-foreground border-border";
};

export default function HistoricoPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // Redirecionar se não for admin
  useEffect(() => {
    if (user && (!ADMIN_EMAIL || user.email?.toLowerCase() !== ADMIN_EMAIL)) {
      navigate("/");
    }
  }, [user, navigate]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  if (!ADMIN_EMAIL || user?.email?.toLowerCase() !== ADMIN_EMAIL) return null;

  const filtered = logs.filter((log) =>
    !filter || log.user_email.includes(filter) || log.action.includes(filter) || (log.details ?? "").includes(filter)
  );

  const header = (
    <div className="px-4 sm:px-6 lg:px-10 py-5 flex items-center gap-4 max-w-[1500px] mx-auto">
      <Button variant="ghost" size="icon" asChild className="shrink-0">
        <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
      </Button>
      <div className="flex items-center gap-3 flex-1">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            <span className="text-gradient-primary">Histórico de Acessos</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Visível apenas para administradores</p>
        </div>
      </div>
      <button onClick={fetchLogs} className="text-muted-foreground hover:text-foreground p-2">
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );

  return (
    <AppShell header={header}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total de eventos", value: logs.length, icon: Clock },
            { label: "Usuários únicos", value: new Set(logs.map(l => l.user_email)).size, icon: User },
            { label: "Hoje", value: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length, icon: Clock },
            { label: "Esta semana", value: logs.filter(l => (Date.now() - new Date(l.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000).length, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div className="glass-card p-4">
          <input
            type="text"
            placeholder="Filtrar por email, ação ou detalhes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Lista */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum evento encontrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate">{log.user_email}</span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    <Clock className="h-3 w-3" />
                    {fmtDate(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
