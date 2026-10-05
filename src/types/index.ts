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
  /** Dívida de hoje: faturas fechadas sem baixa + o que já caiu na fatura aberta. */
  outstanding: number;
  /** Só as faturas que já fecharam e seguem sem baixa. */
  closedDue: number;
  /** Mês da fatura que ainda está recebendo compras ("YYYY-MM"). */
  openBillMonth: string;
  /** Total já lançado na fatura aberta. */
  openBillTotal: number;
  openBillClosingDate: string | null;
  openBillDueDate: string | null;
  openBillPaid: boolean;
  /** Quantas faturas fechadas ainda não foram marcadas como pagas. */
  closedUnpaidCount: number;
  /** Parcelas que ainda vão cair em faturas futuras. */
  futureInstallments: number;
  /** Correção manual do valor em aberto (faturas antigas já pagas). */
  outstandingAdjustment: number;
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

export type BillStatus = "paga" | "fechada" | "aberta" | "futura";

/** Como a fatura foi quitada: transferência da conta, fora do app, ou já lançada à mão. */
export type BillPaymentKind = "transferencia" | "externo" | "lancado";

export interface Bill {
  /** Mês de referência da fatura ("YYYY-MM"). */
  month: string;
  total: number;
  /** Pagamentos já lançados no app para essa fatura. */
  credits: number;
  /** Quanto ainda falta pagar. */
  remaining: number;
  status: BillStatus;
  closingDate: string | null;
  dueDate: string | null;
  items: number;
  payment: { kind: BillPaymentKind; amount: number; date: string } | null;
}

export interface BillsResponse {
  cardId: number;
  cardName: string;
  openBillMonth: string;
  bills: Bill[];
}
