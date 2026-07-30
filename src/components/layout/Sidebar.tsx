import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ListChecks, Users, Upload, LogOut, Sun, Moon, Menu, X, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/PasswordGate";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import logoLumen from "@/assets/logo-lumen.png";

// Email do admin, configurado via env var (VITE_ADMIN_EMAIL) — evita PII no repo.
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? "";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const items: NavItem[] = [
  { to: "/", label: "Painel de Operação e Arrecadação", icon: LayoutDashboard },
  { to: "/indicadores-detalhados", label: "Indicadores Operacionais Detalhados", icon: ListChecks },
  { to: "/funcionarias", label: "Por Funcionária", icon: Users },
  { to: "/upload", label: "Importar Relatórios", icon: Upload },
  { to: "/historico", label: "Histórico de Acessos", icon: Shield, adminOnly: true },
];

interface SidebarContentProps {
  onClose?: () => void;
  /** Sidebar de desktop: quando true, mostra só a faixa fina com o ícone do
   * logo (sem texto, sem nav) e um botão pra expandir. Sem efeito no drawer
   * mobile (que sempre mostra tudo, já é o próprio "expandido"). */
  collapsedRail?: boolean;
  onToggleRail?: () => void;
}

const SidebarContent = ({ onClose, collapsedRail, onToggleRail }: SidebarContentProps) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const isAdmin = !!ADMIN_EMAIL && user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const visibleItems = items.filter(item => !item.adminOnly || isAdmin);

  // Faixa fina recolhida (só ícone do logo + botão de expandir) — usada só
  // na sidebar de desktop, pra sobrar mais espaço horizontal pro conteúdo
  // do dashboard enquanto o menu não está em uso.
  if (collapsedRail) {
    return (
      <div className="flex flex-col h-full items-center">
        <div className="py-5 border-b border-sidebar-border w-full flex justify-center">
          <Link to="/" title="Relacionamento — Obra Lumen • Dashboard">
            <img src={logoLumen} alt="Obra Lumen" className="h-10 w-10 rounded-xl object-cover" />
          </Link>
        </div>
        <button
          type="button"
          onClick={onToggleRail}
          aria-expanded={false}
          title="Expandir menu"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-sidebar-border p-2.5 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-sidebar-border flex items-center justify-between">
        <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
          <img src={logoLumen} alt="Obra Lumen" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <div className="text-sm font-bold text-sidebar-foreground tracking-tight">Relacionamento</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">Obra Lumen • Dashboard</div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {onToggleRail && (
        <button
          type="button"
          onClick={onToggleRail}
          aria-expanded={true}
          className="mx-3 mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="h-4 w-4" />
          Menu
          <ChevronDown className="h-4 w-4 rotate-180 transition-transform" />
        </button>
      )}

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : item.adminOnly
                  ? "text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {item.adminOnly && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Admin</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <button
          onClick={() => setDark(!dark)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? "Modo Claro" : "Modo Escuro"}
        </button>

        <div className="rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Conta conectada</div>
          <div className="text-sm font-semibold text-sidebar-foreground mt-0.5 truncate">
            {user?.email ?? "Google institucional"}
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
};

interface SidebarProps {
  /** Controla a largura da sidebar de desktop (recolhida = faixa fina só
   * com o logo). O AppShell precisa saber desse estado também, pra ajustar
   * o espaço reservado pro conteúdo principal — por isso é controlado de
   * fora, não interno ao Sidebar. */
  desktopNavOpen: boolean;
  onToggleDesktopNav: () => void;
}

const Sidebar = ({ desktopNavOpen, onToggleDesktopNav }: SidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 flex-col bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border z-40 transition-[width] duration-300",
          desktopNavOpen ? "w-64" : "w-20"
        )}
      >
        <SidebarContent collapsedRail={!desktopNavOpen} onToggleRail={onToggleDesktopNav} />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-xl border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoLumen} alt="Obra Lumen" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-sm font-bold text-foreground">Relacionamento</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg bg-card border border-border text-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}

      <aside className={cn(
        "lg:hidden fixed inset-y-0 left-0 w-72 z-50 flex flex-col bg-sidebar/98 backdrop-blur-xl border-r border-sidebar-border transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
};

export default Sidebar;
