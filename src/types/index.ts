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

export type AccountKind = "corrente" | "poupanca" | "dinheiro" | "investimento";

export interface Account {
  id: number;
  name: string;
  kind: AccountKind;
  color: string;
  initialBalance: number;
  balance: number;
  archived: boolean;
  /** Favorito: vem pré-selecionado nos formulários. */
  isDefault: boolean;
  transactionCount: number;
}

export interface Card {
  id: number;
  name: string;
  color: string;
  closingDay: number | null;
  dueDay: number | null;
  limitAmount: number | null;
  paymentAccountId: number | null;
  paymentAccountName: string | null;
  archived: boolean;
  isDefault: boolean;
  /** Tudo que foi gasto menos os pagamentos já lançados. */
  outstanding: number;
  /** Total da fatura do mês consultado. */
  billTotal: number;
  transactionCount: number;
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
  account_id?: number | null;
  account_name?: string | null;
  account_color?: string | null;
  card_id?: number | null;
  card_name?: string | null;
  card_color?: string | null;
  transfer_id?: string | null;
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
