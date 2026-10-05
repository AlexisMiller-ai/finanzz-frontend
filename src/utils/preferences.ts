/**
 * Última conta e último cartão usados, lembrados neste navegador.
 * Servem como sugestão quando não há favorito definido na conta do usuário.
 */
const KEYS = {
  account: "finanzz_last_account",
  card: "finanzz_last_card",
} as const;

export type WalletKind = keyof typeof KEYS;

export function getLastUsed(kind: WalletKind): number | null {
  try {
    const value = Number(localStorage.getItem(KEYS[kind]));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setLastUsed(kind: WalletKind, id: number | null) {
  try {
    if (id) localStorage.setItem(KEYS[kind], String(id));
    else localStorage.removeItem(KEYS[kind]);
  } catch {
    // armazenamento indisponível (modo privado): segue sem lembrar
  }
}

/**
 * Qual conta/cartão vem pré-selecionado: o favorito (vale em qualquer
 * dispositivo), senão o último usado aqui, senão o primeiro da lista.
 */
export function pickDefault<T extends { id: number; isDefault?: boolean }>(
  items: T[],
  kind: WalletKind,
): number | "" {
  if (items.length === 0) return "";
  const favorite = items.find((item) => item.isDefault);
  if (favorite) return favorite.id;

  const lastUsed = getLastUsed(kind);
  if (lastUsed && items.some((item) => item.id === lastUsed)) return lastUsed;

  return items[0]!.id;
}
