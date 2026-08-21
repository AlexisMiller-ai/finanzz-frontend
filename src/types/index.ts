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
  purchase_date?: string | null;
  payment_method?: "dinheiro" | "debito" | "credito";
  installment_group_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
}

export interface DashboardSummary {
  saldoGeralAcumulado: number;
  entradasPeriodo: number;
  saidasPeriodo: number;
  saldoPeriodo: number;
  taxaEconomia: number;
  savingsGoal: number;
  availableToSpend: number;
}

export interface DistributionItem {
  categoryId: number;
  name: string;
  color: string;
  total: number;
  percentage: number;
}
