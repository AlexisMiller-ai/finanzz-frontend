import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Budget, BudgetScope, BudgetSuggestion, Category, DistributionItem } from "../types";
import { formatMonthLabel, formatMonthShort, getCurrentMonth } from "../utils/date";
import { formatMoney, formatPercent, numberToCents } from "../utils/money";
import { ChoiceDialog, Modal } from "../components/Modal";
import { EmptyState, MonthSwitcher, ProgressBar, Skeleton } from "../components/ui/Common";
import { Field, FormError, MoneyInput, Segmented } from "../components/ui/Form";
import { IconAlert, IconCheck, IconEdit, IconPlus, IconTarget, IconTrash } from "../components/ui/Icons";

type BudgetDraft = { categoryId: number | null; limit: number; budgetId?: number; average?: number };

const PACE_BADGE: Record<Budget["pace"], { className: string; label: string }> = {
  estourou: { className: "badge badge-out", label: "estourou" },
  vai_estourar: { className: "badge badge-warning", label: "ritmo alto" },
  atencao: { className: "badge badge-warning", label: "atenção" },
  ok: { className: "badge badge-in", label: "" },
};

const PACE_TONE: Record<Budget["pace"], "good" | "warning" | "bad"> = {
  estourou: "bad",
  vai_estourar: "warning",
  atencao: "warning",
  ok: "good",
};

/**
 * Orçamentos recorrentes: o limite definido num mês vale para os seguintes até
 * ser mudado. Aqui ficam o acompanhamento do mês, o ritmo de gasto e as
 * sugestões de limite pela média dos últimos meses.
 */
export function Budgets() {
  const { month } = useApp();
  const budgets = useFetch<Budget[]>(`/budgets?month=${month}`);
  const suggestions = useFetch<BudgetSuggestion[]>(`/budgets/suggestions?month=${month}`);
  const distribution = useFetch<DistributionItem[]>(`/dashboard/distribution?month=${month}`);
  const { data: categories = [] } = useFetch<Category[]>("/categories");

  const [draft, setDraft] = useState<BudgetDraft | null>(null);
  const [stopping, setStopping] = useState<Budget | null>(null);

  const list = budgets.data ?? [];
  const budgetedIds = new Set(list.map((b) => b.categoryId));
  const unbudgeted = (distribution.data ?? []).filter(
    (d) => d.categoryId === null || !budgetedIds.has(d.categoryId),
  );
  const isCurrentMonth = month === getCurrentMonth();

  const totalLimit = list.reduce((acc, b) => acc + b.limitAmount, 0);
  const totalSpent = list.reduce((acc, b) => acc + b.spent, 0);
  const outsideSpent = unbudgeted.reduce((acc, d) => acc + d.total, 0);
  const suggestionList = suggestions.data ?? [];

  const newBudget = () => setDraft({ categoryId: null, limit: 0 });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">
            Limites por categoria em {formatMonthLabel(month).toLowerCase()} — valem para os meses
            seguintes até você mudar
          </p>
        </div>
        <div className="page-actions">
          <MonthSwitcher />
          <button className="btn btn-primary" onClick={newBudget}>
            <IconPlus size={16} /> Novo orçamento
          </button>
        </div>
      </div>

      {budgets.error && !budgets.data ? (
        <div className="card">
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível carregar os orçamentos"
            description={budgets.error}
            action={<button className="btn btn-secondary" onClick={budgets.reload}>Tentar novamente</button>}
          />
        </div>
      ) : !budgets.data ? (
        <div className="card">
          <Skeleton height={200} />
        </div>
      ) : (
        <>
          {list.length > 0 && (
            <div className="stat-strip">
              <div>
                <div className="stat-strip-label">Orçado</div>
                <div className="stat-strip-value">{formatMoney(totalLimit)}</div>
              </div>
              <div>
                <div className="stat-strip-label">Gasto</div>
                <div className="stat-strip-value">{formatMoney(totalSpent)}</div>
              </div>
              <div>
                <div className="stat-strip-label">
                  {totalLimit - totalSpent >= 0 ? "Restante" : "Acima do orçado"}
                </div>
                <div className={`stat-strip-value ${totalLimit - totalSpent < 0 ? "text-out" : "text-in"}`}>
                  {formatMoney(Math.abs(totalLimit - totalSpent))}
                </div>
              </div>
              <div>
                <div className="stat-strip-label">Fora dos orçamentos</div>
                <div className="stat-strip-value">{formatMoney(outsideSpent)}</div>
              </div>
            </div>
          )}

          {suggestionList.length > 0 && (
            <SuggestionsCard
              month={month}
              items={suggestionList}
              onEdit={(s) =>
                setDraft({ categoryId: s.categoryId, limit: s.suggested, average: s.average })
              }
            />
          )}

          {list.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<IconTarget />}
                title="Nenhum orçamento valendo neste mês"
                description="Defina quanto quer gastar em cada categoria. O limite continua valendo nos próximos meses, sem precisar refazer."
                action={
                  <button className="btn btn-primary" onClick={newBudget}>
                    <IconPlus size={16} /> Criar orçamento
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-main" style={{ alignItems: "start" }}>
              <div className="card card-flush">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Categorias com orçamento</h2>
                    <p className="card-subtitle">
                      {list.length} {list.length === 1 ? "orçamento" : "orçamentos"}
                    </p>
                  </div>
                </div>
                <div className="list" style={{ paddingBottom: 6 }}>
                  {[...list]
                    .sort((a, b) => b.percentageUsed - a.percentageUsed)
                    .map((b) => (
                      <BudgetRow
                        key={b.categoryId}
                        budget={b}
                        showPace={isCurrentMonth}
                        onEdit={() =>
                          setDraft({
                            categoryId: b.categoryId,
                            limit: b.limitAmount,
                            budgetId: b.id,
                            average: b.average,
                          })
                        }
                        onStop={() => setStopping(b)}
                      />
                    ))}
                </div>
              </div>

              <div className="card card-flush">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Gastos sem orçamento</h2>
                    <p className="card-subtitle">Categorias com saídas e sem limite definido</p>
                  </div>
                </div>
                {unbudgeted.length === 0 ? (
                  <EmptyState icon={<IconCheck />} title="Tudo coberto" description="Todos os gastos do mês têm orçamento." />
                ) : (
                  <div className="list" style={{ paddingBottom: 6 }}>
                    {unbudgeted.map((d) => (
                      <div key={d.categoryId ?? "none"} className="list-row">
                        <span className="dot" style={{ background: d.color }} />
                        <div className="row-main">
                          <div className="row-title">{d.name}</div>
                          <div className="row-meta">{formatMoney(d.total)} gastos</div>
                        </div>
                        {d.categoryId !== null && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDraft({ categoryId: d.categoryId, limit: Math.ceil(d.total) })}
                          >
                            Definir limite
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {draft && (
        <BudgetModal
          draft={draft}
          month={month}
          categories={categories.filter(
            (c) => c.type === "despesa" && (c.id === draft.categoryId || !budgetedIds.has(c.id)),
          )}
          onClose={() => setDraft(null)}
        />
      )}
      {stopping && <StopBudgetDialog budget={stopping} month={month} onClose={() => setStopping(null)} />}
    </div>
  );
}

function BudgetRow({
  budget: b,
  showPace,
  onEdit,
  onStop,
}: {
  budget: Budget;
  showPace: boolean;
  onEdit: () => void;
  onStop: () => void;
}) {
  // "Ritmo alto" só existe no mês corrente; nos outros vale a situação final.
  const pace = !showPace && b.pace === "vai_estourar" ? "ok" : b.pace;
  const badge = PACE_BADGE[pace];
  return (
    <div className="list-row" style={{ alignItems: "flex-start" }}>
      <span className="dot" style={{ background: b.color, marginTop: 5 }} />
      <div className="row-main">
        <div className="category-bar-top">
          <span className="row-title">{b.categoryName}</span>
          <span className="nowrap tabular">
            <strong>{formatMoney(b.spent)}</strong> <span className="muted">/ {formatMoney(b.limitAmount)}</span>
          </span>
        </div>
        <ProgressBar percent={b.percentageUsed} tone={PACE_TONE[pace]} />
        <div className="row-meta" style={{ justifyContent: "space-between", marginTop: 6 }}>
          <span>
            {b.remaining >= 0 ? `Restam ${formatMoney(b.remaining)}` : `Passou ${formatMoney(Math.abs(b.remaining))}`}
            {b.inherited && ` · valendo desde ${formatMonthShort(`${b.since}-01`, true).toLowerCase()}`}
          </span>
          <span className={badge.className}>
            {pace === "ok" ? <IconCheck size={11} /> : <IconAlert size={11} />}
            {formatPercent(b.percentageUsed)}
            {badge.label && ` · ${badge.label}`}
          </span>
        </div>
        {showPace && pace === "vai_estourar" && (
          <div className="row-meta text-out" style={{ marginTop: 2 }}>
            No ritmo atual, fecha o mês em {formatMoney(b.projection)}
          </div>
        )}
        {b.average > 0 && (
          <div className="row-meta" style={{ marginTop: 2 }}>
            Média dos últimos 3 meses: {formatMoney(b.average)}
          </div>
        )}
      </div>
      <div className="row-actions" style={{ display: "flex" }}>
        <button className="btn btn-icon" onClick={onEdit} aria-label={`Editar orçamento de ${b.categoryName}`}>
          <IconEdit size={16} />
        </button>
        <button className="btn btn-icon danger" onClick={onStop} aria-label={`Encerrar orçamento de ${b.categoryName}`}>
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  );
}

/** Categorias com gasto e sem orçamento, com limite sugerido pela média. */
function SuggestionsCard({
  month,
  items,
  onEdit,
}: {
  month: string;
  items: BudgetSuggestion[];
  onEdit: (s: BudgetSuggestion) => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function criar(lista: BudgetSuggestion[]) {
    setBusy(true);
    try {
      for (const s of lista) {
        await api.post("/budgets", { category_id: s.categoryId, month_ref: `${month}-01`, limit_amount: s.suggested });
      }
      toast(lista.length === 1 ? `Orçamento de ${lista[0]?.categoryName} criado` : `${lista.length} orçamentos criados`);
      notifyDataChanged();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-flush">
      <div className="card-header">
        <div>
          <h2 className="card-title">Sugestões pela sua média</h2>
          <p className="card-subtitle">
            Quanto você gastou por mês nos últimos 3 meses, arredondado para cima
          </p>
        </div>
        {items.length > 1 && (
          <button className="btn btn-secondary btn-sm" onClick={() => criar(items)} disabled={busy}>
            Criar todos ({items.length})
          </button>
        )}
      </div>
      <div className="list" style={{ paddingBottom: 6 }}>
        {items.map((s) => (
          <div key={s.categoryId} className="list-row">
            <span className="dot" style={{ background: s.color }} />
            <div className="row-main">
              <div className="row-title">{s.categoryName}</div>
              <div className="row-meta">
                média {formatMoney(s.average)}/mês
                {s.monthsWithSpending < 3 && ` · gasto em ${s.monthsWithSpending} dos 3 meses`}
              </div>
            </div>
            <div className="row-amount">{formatMoney(s.suggested)}</div>
            <div className="row-actions" style={{ display: "flex" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => onEdit(s)} disabled={busy}>
                Ajustar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => criar([s])} disabled={busy}>
                Criar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetModal({
  draft,
  month,
  categories,
  onClose,
}: {
  draft: BudgetDraft;
  month: string;
  categories: Category[];
  onClose: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState<number | "">(draft.categoryId ?? "");
  const [cents, setCents] = useState(numberToCents(draft.limit));
  const [scope, setScope] = useState<BudgetScope>("daqui_pra_frente");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!draft.budgetId;
  const mesCurto = formatMonthShort(`${month}-01`, true).toLowerCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return setError("Escolha uma categoria.");
    if (cents <= 0) return setError("Informe um limite maior que zero.");
    setSaving(true);
    setError(null);
    try {
      await api.post("/budgets", {
        category_id: categoryId,
        month_ref: `${month}-01`,
        limit_amount: cents / 100,
        scope,
      });
      toast(
        scope === "so_este_mes"
          ? `Limite ajustado só em ${mesCurto}`
          : isEditing
            ? `Orçamento atualizado a partir de ${mesCurto}`
            : "Orçamento criado",
      );
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEditing ? "Editar orçamento" : "Novo orçamento"}
      description={`A partir de ${formatMonthLabel(month).toLowerCase()}`}
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
        <Field label="Categoria" htmlFor="budget-category">
          <select
            id="budget-category"
            className="select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
            disabled={isEditing}
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {categories.length === 0 && !isEditing && (
          <div className="alert alert-info">Todas as categorias de despesa já têm orçamento neste mês.</div>
        )}
        <Field
          label="Limite mensal"
          htmlFor="budget-limit"
          hint={draft.average ? `Você gastou em média ${formatMoney(draft.average)} por mês nos últimos 3 meses.` : undefined}
        >
          <MoneyInput id="budget-limit" cents={cents} onChange={setCents} large autoFocus={isEditing || !!draft.categoryId} />
        </Field>
        <Field
          label="Vale para"
          hint={
            scope === "daqui_pra_frente"
              ? `De ${mesCurto} em diante, até você mudar de novo.`
              : `Só ${mesCurto}. No mês seguinte volta ao que valia antes.`
          }
        >
          <Segmented<BudgetScope>
            label="Vale para"
            value={scope}
            onChange={setScope}
            options={[
              { value: "daqui_pra_frente", label: "Daqui pra frente" },
              { value: "so_este_mes", label: "Só este mês" },
            ]}
          />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function StopBudgetDialog({ budget, month, onClose }: { budget: Budget; month: string; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const mesCurto = formatMonthShort(`${month}-01`, true).toLowerCase();

  async function stop(scope: BudgetScope) {
    setBusy(true);
    try {
      await api.delete(`/budgets/category/${budget.categoryId}?month=${month}&scope=${scope}`);
      toast(scope === "so_este_mes" ? `Orçamento pausado em ${mesCurto}` : `Orçamento encerrado a partir de ${mesCurto}`);
      notifyDataChanged();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <ChoiceDialog
      title={`Tirar o orçamento de ${budget.categoryName}?`}
      description="Os lançamentos não são afetados, e os meses anteriores mantêm o limite que tinham."
      busy={busy}
      onClose={onClose}
      options={[
        { label: `Encerrar a partir de ${mesCurto}`, variant: "danger", onSelect: () => stop("daqui_pra_frente") },
        { label: `Só em ${mesCurto}`, variant: "secondary", onSelect: () => stop("so_este_mes") },
      ]}
    />
  );
}
