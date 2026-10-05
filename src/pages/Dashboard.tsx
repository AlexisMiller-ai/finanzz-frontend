import { useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import { useThemeColors } from "../hooks/useThemeColors";
import type {
  Account,
  Budget,
  Card,
  DashboardSummary,
  DistributionItem,
  EvolutionPoint,
  Transaction,
} from "../types";
import {
  formatDate,
  formatMonthLabel,
  formatMonthShort,
  getCurrentMonth,
  getGreeting,
  remainingDaysInMonth,
  shiftMonth,
} from "../utils/date";
import { budgetTone } from "../utils/format";
import { formatAxisValue, formatMoney, formatPercent, formatSignedMoney, numberToCents } from "../utils/money";
import { Modal } from "../components/Modal";
import { TransactionFormModal } from "../components/TransactionForm";
import { CategoryIcon, EmptyState, MonthSwitcher, ProgressBar, Skeleton } from "../components/ui/Common";
import { Field, FormError, MoneyInput } from "../components/ui/Form";
import {
  IconAlert,
  IconArrowDown,
  IconArrowUp,
  IconCard,
  IconEdit,
  IconList,
  IconPercent,
  IconPiggy,
  IconTarget,
  IconWallet,
} from "../components/ui/Icons";

export function Dashboard() {
  const { month } = useApp();
  const { user } = useAuth();
  const [goalOpen, setGoalOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const summary = useFetch<DashboardSummary>(`/dashboard/summary?month=${month}`);
  const evolution = useFetch<EvolutionPoint[]>(`/dashboard/evolution?from=${shiftMonth(month, -5)}&months=6`);
  const upcoming = useFetch<EvolutionPoint[]>(`/dashboard/evolution?from=${shiftMonth(month, 1)}&months=3`);
  const distribution = useFetch<DistributionItem[]>(`/dashboard/distribution?month=${month}`);
  const budgets = useFetch<Budget[]>(`/budgets?month=${month}`);
  const accounts = useFetch<Account[]>("/accounts");
  const cards = useFetch<Card[]>(`/cards?month=${month}`);
  const transactions = useFetch<Transaction[]>(`/transactions?month=${month}`);

  const s = summary.data;
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {getGreeting()}, {firstName}
          </h1>
          <p className="page-subtitle">Resumo de {formatMonthLabel(month).toLowerCase()}</p>
        </div>
        <MonthSwitcher />
      </div>

      {summary.error && !s ? (
        <div className="card">
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível carregar o dashboard"
            description={summary.error}
            action={
              <button className="btn btn-secondary" onClick={summary.reload}>
                Tentar novamente
              </button>
            }
          />
        </div>
      ) : (
        <>
          <KpiRow summary={s} />

          <div className="grid grid-main">
            <PlanningCard summary={s} month={month} onEditGoal={() => setGoalOpen(true)} />
            <MoneyCard
              summary={s}
              accounts={accounts.data}
              cards={cards.data}
              upcoming={upcoming.data}
              month={month}
              onEdit={() => setSavingsOpen(true)}
            />
          </div>

          <div className="grid grid-main">
            <EvolutionCard data={evolution.data} month={month} />
            <CategoryCard data={distribution.data} />
          </div>

          <div className="grid grid-halves">
            <BudgetsCard data={budgets.data} />
            <RecentCard data={transactions.data} onSelect={setEditing} />
          </div>
        </>
      )}

      {goalOpen && s && <GoalModal month={month} current={s.savingsGoal} onClose={() => setGoalOpen(false)} />}
      {savingsOpen && s && (
        <SavingsModal current={s.saldoGeralAcumulado} onClose={() => setSavingsOpen(false)} />
      )}
      {editing && <TransactionFormModal editing={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---------------- KPIs ---------------- */

function Delta({ current, previous, higherIsGood }: { current: number; previous: number; higherIsGood: boolean }) {
  if (previous === 0) return <span>sem dados do mês anterior</span>;
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return <span className="delta neutral">= mês anterior</span>;
  const good = change > 0 === higherIsGood;
  return (
    <>
      <span className={`delta ${good ? "good" : "bad"}`}>
        {change > 0 ? "↑" : "↓"} {formatPercent(Math.abs(change))}
      </span>
      <span>vs mês anterior</span>
    </>
  );
}

function KpiRow({ summary: s }: { summary?: DashboardSummary }) {
  if (!s) {
    return (
      <div className="grid grid-kpi">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card kpi">
            <Skeleton width={90} height={12} />
            <Skeleton width="70%" height={26} style={{ marginTop: 8 }} />
            <Skeleton width="60%" height={12} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-kpi">
      <div className="card kpi">
        <div className="kpi-top">
          <span className="kpi-label">Saldo do mês</span>
          <span className="kpi-icon"><IconWallet size={16} /></span>
        </div>
        <div className={`kpi-value ${s.saldoPeriodo < 0 ? "text-out" : ""}`}>{formatMoney(s.saldoPeriodo)}</div>
        <div className="kpi-foot">
          {s.quantidadeLancamentos} {s.quantidadeLancamentos === 1 ? "lançamento" : "lançamentos"}
        </div>
      </div>
      <div className="card kpi">
        <div className="kpi-top">
          <span className="kpi-label">Entradas</span>
          <span className="kpi-icon" style={{ color: "var(--in-text)" }}><IconArrowUp size={16} /></span>
        </div>
        <div className="kpi-value">{formatMoney(s.entradasPeriodo)}</div>
        <div className="kpi-foot">
          <Delta current={s.entradasPeriodo} previous={s.mesAnterior.entradas} higherIsGood />
        </div>
      </div>
      <div className="card kpi">
        <div className="kpi-top">
          <span className="kpi-label">Saídas</span>
          <span className="kpi-icon" style={{ color: "var(--out-text)" }}><IconArrowDown size={16} /></span>
        </div>
        <div className="kpi-value">{formatMoney(s.saidasPeriodo)}</div>
        <div className="kpi-foot">
          <Delta current={s.saidasPeriodo} previous={s.mesAnterior.saidas} higherIsGood={false} />
        </div>
      </div>
      <div className="card kpi">
        <div className="kpi-top">
          <span className="kpi-label">Taxa de economia</span>
          <span className="kpi-icon"><IconPercent size={16} /></span>
        </div>
        <div className={`kpi-value ${s.taxaEconomia < 0 ? "text-out" : ""}`}>
          {s.entradasPeriodo > 0 ? formatPercent(s.taxaEconomia, 1) : "—"}
        </div>
        <div className="kpi-foot">
          {s.entradasPeriodo === 0
            ? "sem entradas no mês"
            : s.taxaEconomia >= 0
              ? "da renda guardada"
              : "gastou mais do que ganhou"}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Planejamento ---------------- */

function PlanningCard({
  summary: s,
  month,
  onEditGoal,
}: {
  summary?: DashboardSummary;
  month: string;
  onEditGoal: () => void;
}) {
  if (!s) {
    return (
      <div className="card">
        <Skeleton width={160} height={16} />
        <Skeleton height={60} style={{ marginTop: 20 }} />
      </div>
    );
  }

  const spendable = s.entradasPeriodo - s.savingsGoal;
  const usedPercent = spendable > 0 ? (s.saidasPeriodo / spendable) * 100 : 0;
  const days = remainingDaysInMonth(month);
  const perDay = days > 0 && s.availableToSpend > 0 ? s.availableToSpend / days : null;
  const goalProgress = s.savingsGoal > 0 ? (s.saldoPeriodo / s.savingsGoal) * 100 : 0;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Planejamento do mês</h2>
          <p className="card-subtitle">Quanto você ainda pode gastar mantendo sua meta de economia</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onEditGoal}>
          <IconTarget size={14} /> {s.savingsGoal > 0 ? "Editar meta" : "Definir meta"}
        </button>
      </div>

      <div className="plan-grid">
        <div>
          <div className="plan-item-label">Disponível para gastar</div>
          <div className={`plan-item-value ${s.availableToSpend < 0 ? "text-out" : "text-in"}`}>
            {formatMoney(s.availableToSpend)}
          </div>
          <div className="field-hint">
            {s.availableToSpend < 0
              ? "Você passou do planejado neste mês"
              : perDay !== null && month === getCurrentMonth()
                ? `≈ ${formatMoney(perDay)} por dia ${days === 1 ? "no último dia do mês" : `nos ${days} dias restantes`}`
                : "entradas − meta − saídas"}
          </div>
        </div>
        <div>
          <div className="plan-item-label">Meta de economia</div>
          <div className="plan-item-value">{s.savingsGoal > 0 ? formatMoney(s.savingsGoal) : "—"}</div>
          <div className="field-hint">
            {s.savingsGoal > 0
              ? goalProgress >= 100
                ? "Meta atingida com o saldo atual"
                : `${formatPercent(Math.max(goalProgress, 0))} atingido pelo saldo`
              : "Nenhuma meta definida"}
          </div>
        </div>
        <div>
          <div className="plan-item-label">Já gasto</div>
          <div className="plan-item-value">{formatMoney(s.saidasPeriodo)}</div>
          <div className="field-hint">
            {spendable > 0 ? `${formatPercent(usedPercent)} do valor disponível` : "Lance suas entradas do mês"}
          </div>
        </div>
      </div>

      {spendable > 0 && (
        <div style={{ marginTop: 18 }}>
          <ProgressBar percent={usedPercent} tone={budgetTone(usedPercent)} />
        </div>
      )}
    </div>
  );
}

/* ---------------- Total guardado ---------------- */

function MoneyCard({
  summary: s,
  accounts,
  cards,
  upcoming,
  month,
  onEdit,
}: {
  summary?: DashboardSummary;
  accounts?: Account[];
  cards?: Card[];
  upcoming?: EvolutionPoint[];
  month: string;
  onEdit: () => void;
}) {
  if (!s || !accounts) {
    return (
      <div className="card">
        <Skeleton width={120} height={14} />
        <Skeleton width="70%" height={28} style={{ marginTop: 12 }} />
        <Skeleton height={80} style={{ marginTop: 20 }} />
      </div>
    );
  }

  const active = accounts.filter((a) => !a.archived);
  const total = active.reduce((sum, a) => sum + a.balance, 0);
  const activeCards = (cards ?? []).filter((c) => !c.archived && (c.billTotal > 0 || c.outstanding > 0));
  const committed = (upcoming ?? []).filter((p) => p.saidas > 0).slice(0, 2);

  return (
    <div className="card card-flush">
      <div className="card-header">
        <div>
          <div className="plan-item-label">
            <IconWallet size={15} /> Saldo em contas
          </div>
          <div className="kpi-value" style={{ fontSize: 28, marginTop: 2 }}>
            {formatMoney(total)}
          </div>
        </div>
        <Link to="/contas" className="link-btn">Gerenciar</Link>
      </div>

      <div className="list">
        {active.length === 0 ? (
          <div className="list-row">
            <div className="row-main">
              <div className="row-meta">Nenhuma conta cadastrada</div>
            </div>
            <Link to="/contas" className="link-btn">Cadastrar</Link>
          </div>
        ) : (
          active.slice(0, 4).map((account) => (
            <div className="list-row" key={account.id}>
              <span className="dot" style={{ background: account.color }} />
              <div className="row-main">
                <div className="row-title">{account.name}</div>
              </div>
              <div className={`row-amount ${account.balance < 0 ? "text-out" : ""}`}>
                {formatMoney(account.balance)}
              </div>
            </div>
          ))
        )}

        {activeCards.map((card) => (
          <div className="list-row" key={`card-${card.id}`}>
            <span className="kpi-icon" style={{ width: 26, height: 26 }}>
              <IconCard size={14} />
            </span>
            <div className="row-main">
              <div className="row-title">{card.name}</div>
              <div className="row-meta">
                fatura de {formatMonthLabel(month).toLowerCase()}
                {card.dueDay ? ` · vence dia ${card.dueDay}` : ""}
                {card.futureInstallments > 0 && (
                  <span>· {formatMoney(card.futureInstallments)} em parcelas futuras</span>
                )}
              </div>
            </div>
            <div className="row-amount">{formatMoney(card.billTotal)}</div>
          </div>
        ))}

        {committed.map((p) => (
          <div className="list-row" key={p.month}>
            <span className="kpi-icon" style={{ width: 26, height: 26 }}>
              <IconArrowDown size={14} />
            </span>
            <div className="row-main">
              <div className="row-title">Já comprometido</div>
              <div className="row-meta">{formatMonthLabel(p.month)}</div>
            </div>
            <div className="row-amount">{formatMoney(p.saidas)}</div>
          </div>
        ))}

        <div className="list-row">
          <span className="kpi-icon" style={{ width: 26, height: 26 }}>
            <IconPiggy size={14} />
          </span>
          <div className="row-main">
            <div className="row-title">Total guardado</div>
            <div className="row-meta">
              desde {formatMonthShort(s.savingsStartDate, true).toLowerCase()}
            </div>
          </div>
          <div className={`row-amount ${s.saldoGeralAcumulado < 0 ? "text-out" : ""}`}>
            {formatMoney(s.saldoGeralAcumulado)}
          </div>
          <button className="btn btn-icon" onClick={onEdit} aria-label="Ajustar total guardado">
            <IconEdit size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Evolução ---------------- */

interface TooltipPayload {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ payload?: EvolutionPoint }>;
}

function EvolutionTooltip({ active, payload }: TooltipPayload) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{formatMonthLabel(point.month)}</div>
      <div className="chart-tooltip-row">
        <span><span className="legend-swatch" style={{ background: "var(--series-in)" }} /> Entradas</span>
        <strong>{formatMoney(point.entradas)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span><span className="legend-swatch" style={{ background: "var(--series-out)" }} /> Saídas</span>
        <strong>{formatMoney(point.saidas)}</strong>
      </div>
      <div className="chart-tooltip-row" style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 5 }}>
        <span>Saldo</span>
        <strong className={point.saldo < 0 ? "text-out" : ""}>{formatMoney(point.saldo)}</strong>
      </div>
    </div>
  );
}

function EvolutionCard({ data, month }: { data?: EvolutionPoint[]; month: string }) {
  const colors = useThemeColors(["--series-in", "--series-out", "--grid", "--text-3", "--surface-hover"]);
  const hasData = data?.some((p) => p.entradas > 0 || p.saidas > 0);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Evolução</h2>
          <p className="card-subtitle">
            {formatMonthShort(shiftMonth(month, -5), true)} a {formatMonthShort(month, true)}
          </p>
        </div>
        <div className="chart-legend">
          <span><span className="legend-swatch" style={{ background: "var(--series-in)" }} /> Entradas</span>
          <span><span className="legend-swatch" style={{ background: "var(--series-out)" }} /> Saídas</span>
        </div>
      </div>
      {!data ? (
        <Skeleton height={240} />
      ) : !hasData ? (
        <EmptyState icon={<IconList />} title="Sem lançamentos nesse período" />
      ) : (
        <div style={{ height: 240, marginLeft: -8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={colors["--grid"]} />
              <XAxis
                dataKey="month"
                tickFormatter={(m: string) => formatMonthShort(m)}
                tick={{ fontSize: 12, fill: colors["--text-3"] }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatAxisValue}
                tick={{ fontSize: 11, fill: colors["--text-3"] }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<EvolutionTooltip />} cursor={{ fill: colors["--surface-hover"] }} />
              <Bar dataKey="entradas" name="Entradas" fill={colors["--series-in"]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="saidas" name="Saídas" fill={colors["--series-out"]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ---------------- Categorias ---------------- */

function CategoryCard({ data }: { data?: DistributionItem[] }) {
  const total = data?.reduce((acc, item) => acc + item.total, 0) ?? 0;
  const top = data?.slice(0, 6) ?? [];
  const rest = data?.slice(6) ?? [];
  const items =
    rest.length > 0
      ? [
          ...top,
          {
            categoryId: -1,
            name: `Outras (${rest.length})`,
            color: "#94A3B8",
            total: rest.reduce((acc, i) => acc + i.total, 0),
            percentage: rest.reduce((acc, i) => acc + i.percentage, 0),
          },
        ]
      : top;
  const max = Math.max(...items.map((i) => i.total), 1);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Gastos por categoria</h2>
          <p className="card-subtitle">{data ? `${formatMoney(total)} no mês` : " "}</p>
        </div>
      </div>
      {!data ? (
        <div className="category-bars">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={28} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<IconArrowDown />} title="Sem saídas neste mês" />
      ) : (
        <div className="category-bars">
          {items.map((item) => (
            <div key={item.categoryId ?? "none"}>
              <div className="category-bar-top">
                <span className="category-bar-name">
                  <span className="dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                </span>
                <span className="nowrap tabular">
                  <strong>{formatMoney(item.total)}</strong>{" "}
                  <span className="muted">{formatPercent(item.percentage)}</span>
                </span>
              </div>
              <div className="category-bar-track">
                <div className="category-bar-fill" style={{ width: `${(item.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Orçamentos ---------------- */

function BudgetsCard({ data }: { data?: Budget[] }) {
  const sorted = [...(data ?? [])].sort((a, b) => b.percentageUsed - a.percentageUsed).slice(0, 5);
  const over = data?.filter((b) => b.percentageUsed > 100).length ?? 0;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Orçamentos</h2>
          <p className="card-subtitle">
            {over > 0 ? `${over} ${over === 1 ? "categoria estourou" : "categorias estouraram"} o limite` : "Limites de gasto por categoria"}
          </p>
        </div>
        <Link to="/metas" className="link-btn">Ver todos</Link>
      </div>
      {!data ? (
        <Skeleton height={140} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<IconTarget />}
          title="Nenhum orçamento neste mês"
          description="Defina limites para acompanhar seus gastos."
          action={<Link to="/metas" className="btn btn-secondary btn-sm">Criar orçamento</Link>}
        />
      ) : (
        <div className="category-bars">
          {sorted.map((b) => (
            <div key={b.id}>
              <div className="category-bar-top">
                <span className="category-bar-name">
                  <span className="dot" style={{ background: b.color }} />
                  <span>{b.categoryName}</span>
                </span>
                <span className="nowrap tabular">
                  {formatMoney(b.spent)} <span className="muted">/ {formatMoney(b.limitAmount)}</span>
                </span>
              </div>
              <ProgressBar percent={b.percentageUsed} tone={budgetTone(b.percentageUsed)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Últimos lançamentos ---------------- */

function RecentCard({ data, onSelect }: { data?: Transaction[]; onSelect: (t: Transaction) => void }) {
  const recent = data?.slice(0, 6) ?? [];
  return (
    <div className="card card-flush">
      <div className="card-header">
        <div>
          <h2 className="card-title">Últimos lançamentos</h2>
          <p className="card-subtitle">{data ? `${data.length} no mês` : " "}</p>
        </div>
        <Link to="/transacoes" className="link-btn">Ver todos</Link>
      </div>
      {!data ? (
        <div style={{ padding: 20 }}>
          <Skeleton height={140} />
        </div>
      ) : recent.length === 0 ? (
        <EmptyState icon={<IconList />} title="Nenhum lançamento neste mês" />
      ) : (
        <div className="list" style={{ paddingBottom: 6 }}>
          {recent.map((t) => (
            <div key={t.id} className="list-row clickable" onClick={() => onSelect(t)}>
              <CategoryIcon name={t.category_name ?? t.description} color={t.category_color} />
              <div className="row-main">
                <div className="row-title">{t.description || t.category_name || "Sem descrição"}</div>
                <div className="row-meta">
                  {t.category_name ?? "Sem categoria"} ·{" "}
                  {formatDate(t.payment_method === "credito" && t.purchase_date ? t.purchase_date : t.date)}
                </div>
              </div>
              <div className={`row-amount ${t.type === "receita" ? "text-in" : ""}`}>
                {formatSignedMoney(Number(t.amount), t.type)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Modais ---------------- */

function GoalModal({ month, current, onClose }: { month: string; current: number; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [cents, setCents] = useState(numberToCents(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: number) {
    setSaving(true);
    setError(null);
    try {
      await api.post("/goals", { month_ref: `${month}-01`, savings_goal: value / 100 });
      toast(value > 0 ? "Meta de economia salva" : "Meta removida");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Meta de economia"
      description={`Quanto você quer guardar em ${formatMonthLabel(month).toLowerCase()}?`}
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        save(cents);
      }}
      footer={
        <>
          {current > 0 && (
            <button type="button" className="btn btn-danger-ghost" disabled={saving} onClick={() => save(0)}>
              Remover meta
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : "Salvar meta"}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Valor da meta" htmlFor="goal">
          <MoneyInput id="goal" cents={cents} onChange={setCents} large autoFocus />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function SavingsModal({ current, onClose }: { current: number; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [cents, setCents] = useState(numberToCents(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put("/savings", { manual_total: cents / 100 });
      toast("Total guardado atualizado");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Ajustar total guardado"
      description="Informe quanto você realmente tem guardado hoje. Daqui pra frente o valor segue atualizando com seus lançamentos."
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : "Salvar"}
        </button>
      }
    >
      <div className="form-stack">
        <Field label="Valor guardado hoje" htmlFor="savings" hint="Para valor negativo, digite um sinal de menos.">
          <MoneyInput id="savings" cents={cents} onChange={setCents} large autoFocus allowNegative />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
