const CLOSING_DAY_KEY = "finanzz_card_closing_day";

/** Dia de fechamento da fatura do cartão (1-31), guardado neste navegador. */
export function getCardClosingDay(): number | null {
  try {
    const value = Number(localStorage.getItem(CLOSING_DAY_KEY));
    return Number.isInteger(value) && value >= 1 && value <= 31 ? value : null;
  } catch {
    return null;
  }
}

export function setCardClosingDay(day: number | null) {
  try {
    if (day) localStorage.setItem(CLOSING_DAY_KEY, String(day));
    else localStorage.removeItem(CLOSING_DAY_KEY);
  } catch {
    // sem armazenamento disponível
  }
}
