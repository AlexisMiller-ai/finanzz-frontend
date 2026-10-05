import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentMonth } from "../utils/date";

export type ThemePreference = "system" | "light" | "dark";

const MONTH_KEY = "finanzz_month";
const THEME_KEY = "finanzz_theme";

function readStorage(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    // armazenamento indisponível (modo privado): segue sem persistir
  }
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;

  // Instalado na tela inicial, a barra do sistema usa esta cor.
  const claro =
    theme === "light" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", claro ? "#ffffff" : "#111018");
}

interface AppContextType {
  /** Mês selecionado ("YYYY-MM"), compartilhado entre as telas. */
  month: string;
  setMonth: (month: string) => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  /** Muda sempre que algum dado é salvo; as telas recarregam ao perceber a mudança. */
  dataVersion: number;
  notifyDataChanged: () => void;
  /** Abre o formulário de novo lançamento de qualquer tela. */
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState(
    () => readStorage(() => sessionStorage, MONTH_KEY) || getCurrentMonth(),
  );
  const [theme, setThemeState] = useState<ThemePreference>(
    () => (readStorage(() => localStorage, THEME_KEY) as ThemePreference) || "system",
  );
  const [dataVersion, setDataVersion] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const setMonth = useCallback((value: string) => {
    setMonthState(value);
    writeStorage(() => sessionStorage, MONTH_KEY, value);
  }, []);

  const setTheme = useCallback((value: ThemePreference) => {
    applyTheme(value);
    setThemeState(value);
    writeStorage(() => localStorage, THEME_KEY, value);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const notifyDataChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      month,
      setMonth,
      theme,
      setTheme,
      dataVersion,
      notifyDataChanged,
      quickAddOpen,
      setQuickAddOpen,
    }),
    [month, setMonth, theme, setTheme, dataVersion, notifyDataChanged, quickAddOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp deve ser usado dentro de um AppProvider");
  return context;
}
