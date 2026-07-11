export interface Category {
  id: number;
  name: string;
  type: "despesa" | "receita";
  color: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: "despesa" | "receita";
  category_id: number | null;
  description: string | null;
  date: string;
}

export interface DashboardSummary {
  saldoGeralAcumulado: number;
  entradasPeriodo: number;
  saidasPeriodo: number;
  saldoPeriodo: number;
  taxaEconomia: number;
}

export interface DistributionItem {
  categoryId: number;
  name: string;
  color: string;
  total: number;
  percentage: number;
}
