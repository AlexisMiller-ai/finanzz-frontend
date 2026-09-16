const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMoney(value: number | string): string {
  return currency.format(Number(value) || 0);
}

/** Valor com sinal explícito: "+ R$ 10,00" / "- R$ 10,00". */
export function formatSignedMoney(value: number, type: "receita" | "despesa") {
  return `${type === "receita" ? "+" : "-"} ${currency.format(Math.abs(value))}`;
}

/** Rótulo curto para eixos de gráfico: 0, 500, 1,5 mil, 12 mil. */
export function formatAxisValue(value: number): string {
  return compact.format(value);
}

export function numberToCents(value: number | string): number {
  return Math.round(Number(value) * 100) || 0;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}
