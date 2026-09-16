import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Budget, Category, DistributionItem } from "../types";
import { formatMonthLabel, shiftMonth } from "../utils/date";
import { budgetTone } from "../utils/format";
import { formatMoney, formatPercent, numberToCents } from "../utils/money";
import { ChoiceDialog, Modal } from "../components/Modal";
import { EmptyState, MonthSwitcher, ProgressBar, Skeleton } from "../components/ui/Common";
import { Field, FormError, MoneyInput } from "../components/ui/Form";
import { IconAlert, IconCheck, IconCopy, IconEdit, IconPlus, IconTarget, IconTrash } from "../components/ui/Icons";

type BudgetDraft = { categoryId: number | null; limit: number; budgetId?: number };

export function Budgets() {
  const { month, notifyDataChanged } = useApp();
  const toast = useToast();
  const previousMonth = shiftMonth(month, -1);
  const budgets = useFetch<Budget[]>(`/budgets?month=${month}`);
  const previous = useFetch<Budget[]>(`/budgets?month=${previousMonth}`);
  const distribution = useFetch<DistributionItem[]>(`/dashboard/distribution?month=${month}`);
  const { data: categories = [] } = useFetch<Category[]>("/categories");

  const [draft, setDraft] = useState<BudgetDraft | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [copying, setCopying] = useState(false);

  const list = budgets.data ?? [];
  const budgetedIds = new Set(list.map((b) => b.categoryId));
  const unbudgeted = (distribution.data ?? []).filter((d) => d.categoryId === null || !budgetedIds.has(d.categoryId));

  const totalLimit = list.reduce((acc, b) => acc + b.limitAmount, 0);
  const totalSpent = list.reduce((acc, b) => acc + b.spent, 0);
  const outsideSpent = unbudgeted.reduce((acc, d) => acc + d.total, 0);
  const missingFromPrevious = (previous.data ?? []).filter((b) => !budgetedIds.has(b.categoryId)).length;

  async function copyPrevious() {
    setCopying(true);
    try {
      const res = await api.post<{ copied: number }>("/budgets/copy", { from_month: previousMonth, to_month: month });
      toast(res.data.copied > 0 ? `${res.data.copied} orçamentos copiados` : "Nenhum orçamento novo para copiar");
      notifyDataChanged();
    } catch (err) {
      toast(getErrorMessage(err), "error");
    } finally {
      setCopying(false);
    }
  }

  const copyButton = missingFromPrevious > 0 && (
    <button className="btn btn-secondary" onClick={copyPrevious} disabled={copying}>
      <IconCopy size={16} /> Copiar de {formatMonthLabel(previousMonth).split(" ")[0]?.toLowerCase()} ({missingFromPrevious})
    </button>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orçamentos</h1>
          <p className="page-subtitle">Limites de gasto por categoria em {formatMonthLabel(month).toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <MonthSwitcher />
          <button className="btn btn-primary" onClick={() => setDraft({ categoryId: null, limit: 0 })}>
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
      ) : list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconTarget />}
            title="Nenhum orçamento neste mês"
            description="Defina quanto quer gastar em cada categoria e acompanhe o progresso ao longo do mês."
            action={
              <div className="page-actions" style={{ justifyContent: "center", marginTop: 8 }}>
                {copyButton}
                <button className="btn btn-primary" onClick={() => setDraft({ categoryId: null, limit: 0 })}>
                  <IconPlus size={16} /> Criar orçamento
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <>
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
              <div className="stat-strip-label">{totalLimit - totalSpent >= 0 ? "Restante" : "Acima do orçado"}</div>
              <div className={`stat-strip-value ${totalLimit - totalSpent < 0 ? "text-out" : "text-in"}`}>
                {formatMoney(Math.abs(totalLimit - totalSpent))}
              </div>
            </div>
            <div>
              <div className="stat-strip-label">Fora dos orçamentos</div>
              <div className="stat-strip-value">{formatMoney(outsideSpent)}</div>
            </div>
          </div>

          {copyButton && <div>{copyButton}</div>}

          <div className="grid grid-main" style={{ alignItems: "start" }}>
            <div className="card card-flush">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Categorias com orçamento</h2>
                  <p className="card-subtitle">{list.length} {list.length === 1 ? "orçamento" : "orçamentos"}</p>
                </div>
              </div>
              <div className="list" style={{ paddingBottom: 6 }}>
                {[...list]
                  .sort((a, b) => b.percentageUsed - a.percentageUsed)
                  .map((b) => {
                    const tone = budgetTone(b.percentageUsed);
                    return (
                      <div key={b.id} className="list-row" style={{ alignItems: "flex-start" }}>
                        <span className="dot" style={{ background: b.color, marginTop: 5 }} />
                        <div className="row-main">
                          <div className="category-bar-top">
                            <span className="row-title">{b.categoryName}</span>
                            <span className="nowrap tabular">
                              <strong>{formatMoney(b.spent)}</strong>{" "}
                              <span className="muted">/ {formatMoney(b.limitAmount)}</span>
                            </span>
                          </div>
                          <ProgressBar percent={b.percentageUsed} tone={tone} />
                          <div className="row-meta" style={{ justifyContent: "space-between", marginTop: 6 }}>
                            <span>
                              {b.remaining >= 0
                                ? `Restam ${formatMoney(b.remaining)}`
                                : `Passou ${formatMoney(Math.abs(b.remaining))}`}
                            </span>
                            <span className={`badge ${tone === "bad" ? "badge-out" : tone === "warning" ? "badge-warning" : "badge-in"}`}>
                              {tone === "good" ? <IconCheck size={11} /> : <IconAlert size={11} />}
                              {formatPercent(b.percentageUsed)}
                              {tone === "bad" ? " · estourou" : tone === "warning" ? " · atenção" : ""}
                            </span>
                          </div>
                        </div>
                        <div className="row-actions" style={{ display: "flex" }}>
                          <button
                            className="btn btn-icon"
                            onClick={() => setDraft({ categoryId: b.categoryId, limit: b.limitAmount, budgetId: b.id })}
                            aria-label={`Editar orçamento de ${b.categoryName}`}
                          >
                            <IconEdit size={16} />
                          </button>
                          <button
                            className="btn btn-icon danger"
                            onClick={() => setDeleting(b)}
                            aria-label={`Excluir orçamento de ${b.categoryName}`}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
        </>
      )}

      {draft && (
        <BudgetModal
          draft={draft}
          month={month}
          categories={categories.filter((c) => c.type === "despesa" && (c.id === draft.categoryId || !budgetedIds.has(c.id)))}
          onClose={() => setDraft(null)}
        />
      )}
      {deleting && <DeleteBudgetDialog budget={deleting} onClose={() => setDeleting(null)} />}
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!draft.budgetId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId) return setError("Escolha uma categoria.");
    if (cents <= 0) return setError("Informe um limite maior que zero.");
    setSaving(true);
    setError(null);
    try {
      await api.post("/budgets", { category_id: categoryId, month_ref: `${month}-01`, limit_amount: cents / 100 });
      toast(isEditing ? "Orçamento atualizado" : "Orçamento criado");
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
      description={formatMonthLabel(month)}
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
        <Field label="Limite mensal" htmlFor="budget-limit">
          <MoneyInput id="budget-limit" cents={cents} onChange={setCents} large autoFocus={isEditing || !!draft.categoryId} />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function DeleteBudgetDialog({ budget, onClose }: { budget: Budget; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await api.delete(`/budgets/${budget.id}`);
      toast("Orçamento excluído");
      notifyDataChanged();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <ChoiceDialog
      title={`Excluir orçamento de ${budget.categoryName}?`}
      description="Os lançamentos não são afetados, só o limite deste mês."
      busy={busy}
      onClose={onClose}
      options={[{ label: "Excluir", variant: "danger", onSelect: handleDelete }]}
    />
  );
}
