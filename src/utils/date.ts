const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function parts(value: string) {
  const [year = 1970, month = 1, day = 1] = value.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

/** "2026-09" -> "Setembro 2026" */
export function formatMonthLabel(month: string): string {
  const { year, month: m } = parts(month);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

/** "2026-09" -> "Set" (com o ano quando pedido: "Set/26") */
export function formatMonthShort(month: string, withYear = false): string {
  const { year, month: m } = parts(month);
  return withYear ? `${MONTH_SHORT[m - 1]}/${String(year).slice(2)}` : MONTH_SHORT[m - 1] ?? "";
}

export function shiftMonth(month: string, delta: number): string {
  const { year, month: m } = parts(month);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Data local (não UTC) no formato "YYYY-MM-DD". */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getCurrentMonth(): string {
  return todayISO().slice(0, 7);
}

/** "2026-09-15" -> "15/09/2026" */
export function formatDate(value: string): string {
  const { year, month, day } = parts(value);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** "2026-09-15" -> "15 de setembro, terça" (sem o ano quando for o atual) */
export function formatDayHeader(value: string): string {
  const { year, month, day } = parts(value);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  const today = todayISO();
  if (value === today) return `Hoje, ${day} de ${MONTH_NAMES[month - 1]?.toLowerCase()}`;
  const yearPart = String(year) === today.slice(0, 4) ? "" : ` de ${year}`;
  return `${day} de ${MONTH_NAMES[month - 1]?.toLowerCase()}${yearPart}, ${weekday}`;
}

export function daysInMonth(month: string): number {
  const { year, month: m } = parts(month);
  return new Date(year, m, 0).getDate();
}

/** Dias restantes no mês, contando hoje. 0 para meses passados. */
export function remainingDaysInMonth(month: string): number {
  const current = getCurrentMonth();
  if (month < current) return 0;
  if (month > current) return daysInMonth(month);
  return daysInMonth(month) - new Date().getDate() + 1;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
