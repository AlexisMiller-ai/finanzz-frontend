import { useEffect, useState } from "react";
import { useApp } from "../contexts/AppContext";

function read<T extends string>(names: readonly T[]): Record<T, string> {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n).trim()])) as Record<T, string>;
}

/**
 * Lê tokens de cor do CSS para usar em atributos SVG (gráficos), que não
 * resolvem var(). Atualiza ao trocar o tema no app ou no sistema.
 */
export function useThemeColors<T extends string>(names: readonly T[]): Record<T, string> {
  const { theme } = useApp();
  const key = names.join("|");
  const [state, setState] = useState(() => ({ theme, key, colors: read(names) }));

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => setState({ theme, key, colors: read(key.split("|") as T[]) });
    media?.addEventListener("change", update);
    return () => media?.removeEventListener("change", update);
  }, [theme, key]);

  // Tema trocado no app: relê as cores na hora (o atributo data-theme já foi aplicado).
  if (state.theme !== theme || state.key !== key) {
    const colors = read(names);
    setState({ theme, key, colors });
    return colors;
  }
  return state.colors;
}
