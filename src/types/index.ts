export type TransactionType = "despesa" | "receita";
export type PaymentMethod = "dinheiro" | "debito" | "credito";
export type EditScope = "single" | "future" | "all";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  transaction_count?: number;
}

export interface Transaction {
  id: number;
  amount: string | number;
  type: TransactionType;
  category_id: number | null;
  category_name?: string | null;
  category_color?: string | null;
  description: string | null;
  date: string;
  purchase_date?: string | null;
  payment_method: PaymentMethod;
  installment_group_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
  recurrence_id?: string | null;
}

export interface DashboardSummary {
  saldoGeralAcumulado: number;
  savingsStartDate: string;
  entradasPeriodo: number;
  saidasPeriodo: number;
  saldoPeriodo: number;
  taxaEconomia: number;
  savingsGoal: number;
  availableToSpend: number;
  cartaoCreditoPeriodo: number;
  quantidadeLancamentos: number;
  mesAnterior: { entradas: number; saidas: number };
}

export interface EvolutionPoint {
  month: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface DistributionItem {
  categoryId: number | null;
  name: string;
  color: string;
  total: number;
  percentage: number;
}

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  color: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
}
