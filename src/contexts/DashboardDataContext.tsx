import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/components/PasswordGate";
import { supabase } from "@/lib/supabase";
import { kpiCards as defaultKpiCards } from "@/data/dashboardData";

export interface DashboardOverrides {
  kpiCards?: typeof defaultKpiCards;
  financialRevenue?: string;
  financialGoal?: string;
  financialYTD?: string;
  financialYTDValue?: string;
  cancelamentos?: string;
  inadimplencia?: string;
  roiAtual?: string;
  periodo?: string;
}

export interface EmployeeOverride {
  kpis?: { label: string; value: string; meta: string; color: string }[];
  additionalMetrics?: { label: string; value: string; borderColor: string }[];
}

export type EmployeeOverrides = Record<string, Record<string, EmployeeOverride>>;

interface DashboardDataContextType {
  overrides: DashboardOverrides;
  employeeOverrides: EmployeeOverrides;
  updateOverrides: (data: Partial<DashboardOverrides>) => Promise<void>;
  updateEmployeeOverrides: (funcionaria: string, mes: string, data: EmployeeOverride) => Promise<void>;
  resetOverrides: () => Promise<void>;
  loading: boolean;
}

const DashboardDataContext = createContext<DashboardDataContextType | null>(null);

// Storage keys
const STORAGE_KEY_OVERRIDES = "dashboard_overrides";
const STORAGE_KEY_EMP_OVERRIDES = "dashboard_employee_overrides";
const isDemoUser = (userId?: string) => !userId || userId.startsWith("demo-user");
const normalizeText = (value: string | null | undefined) =>
  value?.trim() ? value : undefined;
const normalizeKpiCards = (cards: typeof defaultKpiCards | null | undefined) =>
  cards?.map((card, index) => ({
    ...card,
    value: normalizeText(card.value) ?? defaultKpiCards[index]?.value ?? "",
    meta: normalizeText(card.meta) ?? defaultKpiCards[index]?.meta ?? "",
  }));

type DashboardOverrideRow = {
  id: string;
  user_id: string;
  periodo: string | null;
  kpi_cards: typeof defaultKpiCards | null;
  financial_revenue: string | null;
  financial_goal: string | null;
  financial_ytd: string | null;
  financial_ytd_value: string | null;
  cancelamentos: string | null;
  inadimplencia: string | null;
  roi_atual: string | null;
  updated_at?: string;
};

type DashboardEmployeeOverrideRow = {
  id: string;
  funcionario: string;
  mes: string;
  data: EmployeeOverride | null;
  updated_at?: string;
};

const rowToOverrides = (row: DashboardOverrideRow | null): DashboardOverrides => {
  if (!row) return {};

  return {
    kpiCards: normalizeKpiCards(row.kpi_cards),
    financialRevenue: normalizeText(row.financial_revenue),
    financialGoal: normalizeText(row.financial_goal),
    financialYTD: normalizeText(row.financial_ytd),
    financialYTDValue: normalizeText(row.financial_ytd_value),
    cancelamentos: normalizeText(row.cancelamentos),
    inadimplencia: normalizeText(row.inadimplencia),
    roiAtual: normalizeText(row.roi_atual),
    periodo: normalizeText(row.periodo),
  };
};

const overridesToRow = (userId: string, data: DashboardOverrides) => ({
  user_id: userId,
  updated_at: new Date().toISOString(),
  periodo: normalizeText(data.periodo) ?? null,
  kpi_cards: normalizeKpiCards(data.kpiCards) ?? null,
  financial_revenue: normalizeText(data.financialRevenue) ?? null,
  financial_goal: normalizeText(data.financialGoal) ?? null,
  financial_ytd: normalizeText(data.financialYTD) ?? null,
  financial_ytd_value: normalizeText(data.financialYTDValue) ?? null,
  cancelamentos: normalizeText(data.cancelamentos) ?? null,
  inadimplencia: normalizeText(data.inadimplencia) ?? null,
  roi_atual: normalizeText(data.roiAtual) ?? null,
});

const normalizeOverrides = (data: DashboardOverrides): DashboardOverrides => ({
  ...data,
  kpiCards: normalizeKpiCards(data.kpiCards),
  financialRevenue: normalizeText(data.financialRevenue),
  financialGoal: normalizeText(data.financialGoal),
  financialYTD: normalizeText(data.financialYTD),
  financialYTDValue: normalizeText(data.financialYTDValue),
  cancelamentos: normalizeText(data.cancelamentos),
  inadimplencia: normalizeText(data.inadimplencia),
  roiAtual: normalizeText(data.roiAtual),
  periodo: normalizeText(data.periodo),
});

// Local storage functions
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : defaultValue;
    return key === STORAGE_KEY_OVERRIDES ? (normalizeOverrides(parsed) as T) : parsed;
  } catch (error) {
    console.error("Erro ao carregar do localStorage:", error);
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  try {
    const normalizedValue = key === STORAGE_KEY_OVERRIDES ? normalizeOverrides(value as DashboardOverrides) : value;
    localStorage.setItem(key, JSON.stringify(normalizedValue));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent("dashboardUpdate", { detail: { key, value: normalizedValue } }));
  } catch (error) {
    console.error("Erro ao salvar no localStorage:", error);
  }
};

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<DashboardOverrides>({});
  const [employeeOverrides, setEmployeeOverrides] = useState<EmployeeOverrides>({});
  const [loading, setLoading] = useState(true);
  const overridesRef = useRef<DashboardOverrides>({});
  const employeeOverridesRef = useRef<EmployeeOverrides>({});
  const isLoadingRef = useRef(false); // Evitar múltiplas cargas simultâneas

  const applyOverrides = useCallback((next: DashboardOverrides) => {
    overridesRef.current = next;
    setOverrides(next);
  }, []);

  const applyEmployeeOverrides = useCallback((next: EmployeeOverrides) => {
    employeeOverridesRef.current = next;
    setEmployeeOverrides(next);
  }, []);

  const loadOverridesFromSupabase = useCallback(async () => {
    const userId = user?.id;
    const localOverrides = loadFromStorage<DashboardOverrides>(STORAGE_KEY_OVERRIDES, {});
    if (isDemoUser(userId)) return localOverrides;

    try {
      const { data, error } = await supabase
        .from("dashboard_overrides")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<DashboardOverrideRow>();

      if (error) {
        console.error("Erro ao carregar configurações do Supabase:", error);
        return localOverrides;
      }

      const remoteOverrides = rowToOverrides(data);
      const mergedOverrides = { ...remoteOverrides, ...localOverrides };
      saveToStorage(STORAGE_KEY_OVERRIDES, mergedOverrides);
      return mergedOverrides;
    } catch (error) {
      console.error("Erro ao carregar configurações do Supabase:", error);
      return localOverrides;
    }
  }, [user?.id]);

  const saveOverridesToSupabase = useCallback(async (next: DashboardOverrides) => {
    const userId = user?.id;
    if (isDemoUser(userId)) return;

    const payload = overridesToRow(userId, next);
    const { error } = await supabase
      .from("dashboard_overrides")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw error;
  }, [user?.id]);

  const loadEmployeeOverridesFromSupabase = useCallback(async () => {
    const localEmployeeOverrides = loadFromStorage<EmployeeOverrides>(STORAGE_KEY_EMP_OVERRIDES, {});
    if (isDemoUser(user?.id)) return localEmployeeOverrides;

    try {
      const { data, error } = await supabase
        .from("dashboard_employee_overrides")
        .select("*");

      if (error) {
        console.warn("Usando dados locais de funcionárias; tabela Supabase indisponível:", error);
        return localEmployeeOverrides;
      }

      const remoteEmployeeOverrides = (data ?? []).reduce<EmployeeOverrides>((acc, row: DashboardEmployeeOverrideRow) => {
        if (!row.data) return acc;
        acc[row.funcionario] = {
          ...(acc[row.funcionario] ?? {}),
          [row.mes]: row.data,
        };
        return acc;
      }, {});

      const merged = { ...remoteEmployeeOverrides };
      Object.keys(localEmployeeOverrides).forEach((funcionaria) => {
        merged[funcionaria] = {
          ...(merged[funcionaria] ?? {}),
          ...localEmployeeOverrides[funcionaria],
        };
      });

      saveToStorage(STORAGE_KEY_EMP_OVERRIDES, merged);
      return merged;
    } catch (error) {
      console.warn("Usando dados locais de funcionárias; erro ao carregar Supabase:", error);
      return localEmployeeOverrides;
    }
  }, [user?.id]);

  const saveEmployeeOverrideToSupabase = useCallback(async (funcionaria: string, mes: string, data: EmployeeOverride) => {
    if (isDemoUser(user?.id)) return;

    const payload = { funcionario: funcionaria, mes, data, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("dashboard_employee_overrides")
      .upsert(payload, { onConflict: "funcionario, mes" });

    if (error) throw error;
  }, [user?.id]);

  // Initial load and setup listeners
  useEffect(() => {
    let cancelled = false;

    // Se já está carregando, não fazer novamente
    if (isLoadingRef.current) {
      return;
    }

    setLoading(true);
    isLoadingRef.current = true;

    const localOverrides = loadFromStorage<DashboardOverrides>(STORAGE_KEY_OVERRIDES, {});
    applyOverrides(localOverrides);
    applyEmployeeOverrides(loadFromStorage<EmployeeOverrides>(STORAGE_KEY_EMP_OVERRIDES, {}));

    // Apenas carrega do Supabase se há usuário autenticado
    if (user?.id && !isDemoUser(user.id)) {
      const doLoad = async () => {
        try {
          const [savedOverrides, savedEmployeeOverrides] = await Promise.all([
            loadOverridesFromSupabase(),
            loadEmployeeOverridesFromSupabase(),
          ]);

          if (!cancelled) {
            applyOverrides(savedOverrides);
            applyEmployeeOverrides(savedEmployeeOverrides);
          }
        } catch (error) {
          console.error("[Context] Erro ao carregar do Supabase:", error);
          if (!cancelled) {
            applyOverrides(localOverrides);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
            isLoadingRef.current = false;
          }
        }
      };

      doLoad();
    } else {
      setLoading(false);
      isLoadingRef.current = false;
    }

    // Listen for custom event from this tab
    const handleDashboardUpdate = (e: Event) => {
      const event = e as CustomEvent;

      if (event.detail.key === STORAGE_KEY_OVERRIDES) {
        applyOverrides(event.detail.value);
      }
      if (event.detail.key === STORAGE_KEY_EMP_OVERRIDES) {
        applyEmployeeOverrides(event.detail.value);
      }
    };

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_OVERRIDES) {
        const newData = e.newValue ? normalizeOverrides(JSON.parse(e.newValue)) : {};
        applyOverrides(newData);
      }
      if (e.key === STORAGE_KEY_EMP_OVERRIDES) {
        const newData = e.newValue ? JSON.parse(e.newValue) : {};
        applyEmployeeOverrides(newData);
      }
    };

    window.addEventListener("dashboardUpdate", handleDashboardUpdate);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      cancelled = true;
      isLoadingRef.current = false;
      window.removeEventListener("dashboardUpdate", handleDashboardUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [user?.id, applyEmployeeOverrides, applyOverrides, loadEmployeeOverridesFromSupabase, loadOverridesFromSupabase]);

  const updateOverrides = useCallback(async (data: Partial<DashboardOverrides>) => {
    const next = normalizeOverrides({ ...overridesRef.current, ...data });

    applyOverrides(next);
    saveToStorage(STORAGE_KEY_OVERRIDES, next);

    const userId = user?.id;
    if (isDemoUser(userId)) {
      return;
    }

    try {
      await saveOverridesToSupabase(next);
    } catch (error) {
      console.error("[updateOverrides] Erro ao sincronizar com Supabase (dados mantidos localmente):", error);
      throw error;
    }
  }, [applyOverrides, saveOverridesToSupabase, user?.id]);

  const updateEmployeeOverrides = useCallback(async (funcionaria: string, mes: string, data: EmployeeOverride) => {
    const next = {
      ...employeeOverridesRef.current,
      [funcionaria]: {
        ...(employeeOverridesRef.current[funcionaria] ?? {}),
        [mes]: data,
      },
    };
    applyEmployeeOverrides(next);
    saveToStorage(STORAGE_KEY_EMP_OVERRIDES, next);

    if (isDemoUser(user?.id)) {
      return;
    }

    try {
      await saveEmployeeOverrideToSupabase(funcionaria, mes, data);
    } catch (error) {
      console.error(`[updateEmployeeOverrides] Erro ao sincronizar ${funcionaria} (dados mantidos localmente):`, error);
      throw error;
    }
  }, [applyEmployeeOverrides, saveEmployeeOverrideToSupabase, user?.id]);

  const resetOverrides = useCallback(async () => {
    applyOverrides({});
    applyEmployeeOverrides({});
    localStorage.removeItem(STORAGE_KEY_OVERRIDES);
    localStorage.removeItem(STORAGE_KEY_EMP_OVERRIDES);

    const userId = user?.id;
    if (!isDemoUser(userId)) {
      try {
        const { error } = await supabase
          .from("dashboard_overrides")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
      } catch (error) {
        console.error("[resetOverrides] Erro ao deletar do Supabase:", error);
        throw error;
      }
    }
  }, [user?.id]);

  return (
    <DashboardDataContext.Provider value={{ overrides, employeeOverrides, updateOverrides, updateEmployeeOverrides, resetOverrides, loading }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error("useDashboardData must be inside DashboardDataProvider");
  return ctx;
}
