import * as React from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import logoLumen from "@/assets/logo-lumen.png";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/useAudit";
import type { User } from "@supabase/supabase-js";

interface AuthContext {
  user: User | null;
  logout: () => void;
}

const AuthCtx = React.createContext<AuthContext | null>(null);
const AUTH_TIMEOUT_MS = 15000;

// Lista de emails autorizados a acessar o dashboard, configurada via env var
// (VITE_ALLOWED_EMAILS, separados por vírgula). Isso mantém o repositório
// livre de dados pessoais reais — cada instalação define sua própria lista.
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS as string | undefined)
  ?.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean) ?? [];

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside PasswordGate");
  return ctx;
}

const withTimeout = async <T,>(promise: Promise<T>, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

const clearAuthStorage = () => {
  const clearMatchingKeys = (storage: Storage) => {
    Object.keys(storage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth.token")) {
        storage.removeItem(key);
      }
    });
  };

  try {
    clearMatchingKeys(localStorage);
  } catch {}
  try {
    clearMatchingKeys(sessionStorage);
  } catch {}

  try {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    cookies.forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("sb-") || name.includes("supabase") || name.includes("supabase.auth.token")) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        document.cookie = `${name}=; Domain=${window.location.hostname}; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      }
    });
  } catch (error) {
    console.warn("Nao foi possivel limpar cookies de autenticacao automaticamente:", error);
  }
};

const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [storageAvailable, setStorageAvailable] = React.useState(true);

  const isDemoMode = !import.meta.env.VITE_SUPABASE_URL;
  const allowedEmailDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN as string | undefined)?.trim().toLowerCase();

  const isAuthorizedEmail = React.useCallback(
    (email?: string | null) => {
      if (!email) return false;
      const normalized = email.toLowerCase();
      // Se VITE_ALLOWED_EMAILS estiver configurada, ela manda. Caso contrário,
      // cai para a checagem por domínio (VITE_ALLOWED_EMAIL_DOMAIN) — útil
      // pra organizações que preferem autorizar o domínio inteiro.
      if (ALLOWED_EMAILS.length > 0) return ALLOWED_EMAILS.includes(normalized);
      if (allowedEmailDomain) return normalized.endsWith(`@${allowedEmailDomain}`);
      return false;
    },
    [allowedEmailDomain]
  );

  const enterDemoMode = React.useCallback(() => {
    setUser({
      id: "demo-user",
      email: "demo@example.com",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User);
  }, []);

  const clearSessionState = React.useCallback(async () => {
    setUser(null);
    clearAuthStorage();
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }, []);

  const acceptUser = React.useCallback(
    async (authUser: User) => {
      if (!isAuthorizedEmail(authUser.email)) {
        setError("Este email não tem acesso autorizado ao dashboard. Contate a coordenação.");
        await clearSessionState();
        return;
      }

      setError("");
      setUser(authUser);
    },
    [clearSessionState, isAuthorizedEmail]
  );

  React.useEffect(() => {
    let mounted = true;

    const url = new URL(window.location.href);
    const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    if (oauthError) {
      setError(`Falha no login com Google: ${oauthError}`);
      window.history.replaceState({}, document.title, `${url.pathname}${url.hash}`);
    }

    const canUseStorage = () => {
      if (typeof window === "undefined") return false;
      try {
        const testKey = "__storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    };

    setStorageAvailable(canUseStorage());

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await withTimeout(supabase.auth.getSession(), "Tempo esgotado ao recuperar sessao");

        if (!mounted) return;
        if (sessionError) throw sessionError;

        if (session?.user) {
          await acceptUser(session.user);
        } else if (isDemoMode) {
          enterDemoMode();
        }
      } catch (authError) {
        console.warn("[PasswordGate] Erro na inicializacao:", authError);
        if (!mounted) return;
        if (isDemoMode) enterDemoMode();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setSubmitting(false);
        return;
      }

      if (!session?.user) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        try {
          await acceptUser(session.user);
          if (event === "SIGNED_IN") {
            logAudit(session.user.email ?? "desconhecido", "Acesso ao dashboard", `Login via Google`);
          }
        } catch (authError) {
          console.warn("[PasswordGate] Falha ao validar usuario:", authError);
        } finally {
          setSubmitting(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [acceptUser, enterDemoMode, isDemoMode]);

  const handleGoogleLogin = async () => {
    setError("");
    setSubmitting(true);

    if (isDemoMode) {
      enterDemoMode();
      setSubmitting(false);
      return;
    }

    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const queryParams = allowedEmailDomain ? { hd: allowedEmailDomain } : undefined;
    const { error: authError } = await withTimeout(
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams,
        },
      }),
      "Tempo esgotado ao iniciar login com Google"
    ).catch((loginError) => ({ error: loginError }));

    if (authError) {
      setError("Nao foi possivel iniciar o login com Google.");
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await clearSessionState();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B7E91] to-[#155F6E]">
        <div className="text-white text-sm opacity-60">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return <AuthCtx.Provider value={{ user, logout }}>{children}</AuthCtx.Provider>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B7E91] to-[#155F6E]">
      <div className="bg-card rounded-xl shadow-2xl p-8 w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoLumen} alt="Obra Lumen - Ser Feliz" className="h-28 w-auto mb-2" />
          <div className="bg-primary/10 p-3 rounded-full">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Acesso ao Dashboard</h1>
          <p className="text-sm text-muted-foreground text-center">
            Entre com sua conta Google institucional
          </p>
        </div>

        {!storageAvailable && (
          <p className="text-sm text-yellow-500">
            O navegador esta bloqueando o armazenamento local. O login pode nao persistir entre visitas.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="button" className="w-full gap-3" disabled={submitting} onClick={handleGoogleLogin}>
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-sm font-bold text-[#4285F4]">
            G
          </span>
          {submitting ? "Abrindo Google..." : "Entrar com Google"}
        </Button>

        <p className="text-xs text-muted-foreground/60 text-center">
          Acesso restrito a membros autorizados da coordenação
        </p>
      </div>
    </div>
  );
};

export default PasswordGate;
