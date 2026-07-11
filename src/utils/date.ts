const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

export function formatMonthShort(month: string): string {
  const [, m] = month.split("-").map(Number);
  return MONTH_SHORT[m - 1];
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}

export function getLastNMonths(month: string, n: number): string[] {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(shiftMonth(month, -i));
  }
  return months;
}
