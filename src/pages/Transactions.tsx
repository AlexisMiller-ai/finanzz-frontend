import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Account, Card, Category, EditScope, PaymentMethod, Transaction, TransactionType } from "../types";
import { formatDate, formatDayHeader, formatMonthLabel } from "../utils/date";
import { formatMoney, formatSignedMoney } from "../utils/money";
import { ChoiceDialog } from "../components/Modal";
import { TransactionFormModal } from "../components/TransactionForm";
import { CategoryIcon, EmptyState, MonthSwitcher, Skeleton } from "../components/ui/Common";
import { Segmented } from "../components/ui/Form";
import {
  IconAlert,
  IconCard,
  IconDownload,
  IconUpload,
  IconEdit,
  IconList,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "../components/ui/Icons";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  dinheiro: "Pix/Dinheiro",
  debito: "Débito",
  credito: "Crédito",
};

const INSTALLMENT_SUFFIX = /\s*\(\d+\/\d+\)$/;

function titleOf(t: Transaction) {
  return (t.description ?? "").replace(INSTALLMENT_SUFFIX, "") || t.category_name || "Sem descrição";
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function Transactions() {
  const { month, notifyDataChanged, setQuickAddOpen } = useApp();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Transaction[]>(`/transactions?month=${month}`);
  const { data: categories = [] } = useFetch<Category[]>("/categories");
  const { data: accounts = [] } = useFetch<Account[]>("/accounts");
  const { data: cards = [] } = useFetch<Card[]>("/cards");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMethod>("all");
  // "account:3" ou "card:2"
  const [walletFilter, setWalletFilter] = useState("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return (data ?? []).filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (paymentFilter !== "all" && t.payment_method !== paymentFilter) return false;
      if (walletFilter !== "all") {
        const [kind, id] = walletFilter.split(":");
        const matches =
          kind === "card" ? t.card_id === Number(id) : t.account_id === Number(id);
        if (!matches) return false;
      }
      if (categoryFilter === "none" && t.category_id !== null) return false;
      if (categoryFilter !== "all" && categoryFilter !== "none" && t.category_id !== Number(categoryFilter)) return false;
      if (term) {
        const haystack = normalize(`${t.description ?? ""} ${t.category_name ?? ""} ${t.amount}`);
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [data, search, typeFilter, categoryFilter, paymentFilter, walletFilter]);

  const stats = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let cartao = 0;
    for (const t of filtered) {
      // Transferência não é receita nem despesa: o dinheiro só mudou de lugar.
      if (t.transfer_id) continue;
      const value = Number(t.amount);
      if (t.type === "receita") entradas += value;
      else {
        saidas += value;
        if (t.payment_method === "credito") cartao += value;
      }
    }
    return { entradas, saidas, saldo: entradas - saidas, cartao };
  }, [filtered]);

  const groups = useMemo(() => {
    const card = filtered.filter((t) => t.type === "despesa" && t.payment_method === "credito");
    const others = filtered.filter((t) => !(t.type === "despesa" && t.payment_method === "credito"));
    const byDay = new Map<string, Transaction[]>();
    for (const t of others) {
      const list = byDay.get(t.date) ?? [];
      list.push(t);
      byDay.set(t.date, list);
    }
    const result: { key: string; label: React.ReactNode; total: number; items: Transaction[] }[] = [];
    if (card.length > 0) {
      const sortedCard = [...card].sort((a, b) =>
        (b.purchase_date ?? b.date).localeCompare(a.purchase_date ?? a.date),
      );
      result.push({
        key: "card",
        label: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconCard size={14} /> Fatura do cartão · {formatMonthLabel(month)}
          </span>
        ),
        total: -card.reduce((acc, t) => acc + Number(t.amount), 0),
        items: sortedCard,
      });
    }
    for (const [date, items] of byDay) {
      result.push({
        key: date,
        label: formatDayHeader(date),
        total: items.reduce(
          (acc, t) => acc + (t.transfer_id ? 0 : (t.type === "receita" ? 1 : -1) * Number(t.amount)),
          0,
        ),
        items,
      });
    }
    return result;
  }, [filtered, month]);

  const hasFilters =
    search || typeFilter !== "all" || categoryFilter !== "all" || paymentFilter !== "all" || walletFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setPaymentFilter("all");
    setWalletFilter("all");
  }

  async function handleDelete(t: Transaction, scope: EditScope) {
    setBusy(true);
    try {
      const res = await api.delete<{ deleted: number }>(`/transactions/${t.id}`, { params: { scope } });
      const count = res.data.deleted;
      toast(count > 1 ? `${count} lançamentos excluídos` : "Lançamento excluído");
      notifyDataChanged();
      setDeleting(null);
    } catch (err) {
      toast(getErrorMessage(err, "Não foi possível excluir."), "error");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ["Data", "Data da compra", "Descrição", "Categoria", "Tipo", "Forma de pagamento", "Parcela", "Valor"];
    const rows = filtered.map((t) => [
      formatDate(t.date),
      t.purchase_date ? formatDate(t.purchase_date) : "",
      titleOf(t),
      t.category_name ?? "",
      t.type === "receita" ? "Receita" : "Despesa",
      PAYMENT_LABEL[t.payment_method],
      t.installment_total ? `${t.installment_number}/${t.installment_total}` : "",
      ((t.type === "receita" ? 1 : -1) * Number(t.amount)).toFixed(2).replace(".", ","),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const BOM = String.fromCharCode(0xfeff); // faz o Excel abrir com acentos corretos
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzz-lancamentos-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const isGroup = (t: Transaction) => !!(t.installment_group_id || t.recurrence_id);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-subtitle">Tudo que entrou e saiu em {formatMonthLabel(month).toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <MonthSwitcher />
          <Link className="btn btn-secondary hide-mobile" to="/importar">
            <IconUpload size={16} /> Importar
          </Link>
          <button className="btn btn-secondary hide-mobile" onClick={exportCsv} disabled={filtered.length === 0}>
            <IconDownload size={16} /> Exportar
          </button>
          <button className="btn btn-primary hide-mobile" onClick={() => setQuickAddOpen(true)}>
            <IconPlus size={16} /> Novo
          </button>
        </div>
      </div>

      <div className="stat-strip">
        <div>
          <div className="stat-strip-label">Entradas</div>
          <div className="stat-strip-value text-in">{formatMoney(stats.entradas)}</div>
        </div>
        <div>
          <div className="stat-strip-label">Saídas</div>
          <div className="stat-strip-value">{formatMoney(stats.saidas)}</div>
        </div>
        <div>
          <div className="stat-strip-label">Saldo</div>
          <div className={`stat-strip-value ${stats.saldo < 0 ? "text-out" : ""}`}>{formatMoney(stats.saldo)}</div>
        </div>
        <div>
          <div className="stat-strip-label">Cartão de crédito</div>
          <div className="stat-strip-value">{formatMoney(stats.cartao)}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-group">
          <span className="input-prefix"><IconSearch size={16} /></span>
          <input
            className="input"
            placeholder="Buscar por descrição, categoria ou valor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar lançamentos"
          />
        </div>
        <Segmented
          label="Tipo"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "Todos" },
            { value: "despesa", label: "Despesas" },
            { value: "receita", label: "Receitas" },
          ]}
        />
        <select
          className="select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          <option value="all">Todas as categorias</option>
          <option value="none">Sem categoria</option>
          {categories
            .filter((c) => typeFilter === "all" || c.type === typeFilter)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <select
          className="select"
          value={walletFilter}
          onChange={(e) => setWalletFilter(e.target.value)}
          aria-label="Filtrar por conta ou cartão"
        >
          <option value="all">Todas as contas</option>
          {accounts
            .filter((a) => !a.archived)
            .map((a) => (
              <option key={`account:${a.id}`} value={`account:${a.id}`}>
                {a.name}
              </option>
            ))}
          {cards
            .filter((c) => !c.archived)
            .map((c) => (
              <option key={`card:${c.id}`} value={`card:${c.id}`}>
                Cartão · {c.name}
              </option>
            ))}
        </select>
        <select
          className="select"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as "all" | PaymentMethod)}
          aria-label="Filtrar por forma de pagamento"
        >
          <option value="all">Qualquer pagamento</option>
          <option value="dinheiro">Pix/Dinheiro</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <IconX size={14} /> Limpar
          </button>
        )}
      </div>

      <div className="card card-flush" style={{ overflow: "hidden", opacity: loading && data ? 0.6 : 1 }}>
        {error && !data ? (
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível carregar os lançamentos"
            description={error}
            action={<button className="btn btn-secondary" onClick={reload}>Tentar novamente</button>}
          />
        ) : !data ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={36} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<IconSearch />}
              title="Nada encontrado com esses filtros"
              action={<button className="btn btn-secondary btn-sm" onClick={clearFilters}>Limpar filtros</button>}
            />
          ) : (
            <EmptyState
              icon={<IconList />}
              title="Nenhum lançamento neste mês"
              description="Registre gastos e receitas para acompanhar seu mês."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setQuickAddOpen(true)}>
                  <IconPlus size={14} /> Novo lançamento
                </button>
              }
            />
          )
        ) : (
          groups.map((group) => (
            <section key={group.key}>
              <div className="list-group-header">
                <span>{group.label}</span>
                <span className="tabular">{formatMoney(group.total)}</span>
              </div>
              <div className="list">
                {group.items.map((t) => (
                  <div
                    key={t.id}
                    className="list-row clickable"
                    onClick={() => (t.transfer_id ? setDeleting(t) : setEditing(t))}
                  >
                    <CategoryIcon name={t.category_name ?? t.description} color={t.category_color} />
                    <div className="row-main">
                      <div className="row-title">{titleOf(t)}</div>
                      <div className="row-meta">
                        {!t.transfer_id && <span>{t.category_name ?? "Sem categoria"}</span>}
                        {t.payment_method === "credito" && t.purchase_date && (
                          <span>· compra em {formatDate(t.purchase_date)}</span>
                        )}
                        {!t.transfer_id && t.type === "despesa" && t.payment_method !== "credito" && (
                          <span>· {PAYMENT_LABEL[t.payment_method]}</span>
                        )}
                        {t.installment_total && (
                          <span className="badge badge-primary">
                            {t.installment_number}/{t.installment_total}
                          </span>
                        )}
                        {t.recurrence_id && <span className="badge">Fixa</span>}
                        {t.transfer_id && <span className="badge badge-primary">Transferência</span>}
                        {(t.account_name || t.card_name) && (
                          <span>· {t.card_name ?? t.account_name}</span>
                        )}
                      </div>
                    </div>
                    <div className={`row-amount ${t.type === "receita" ? "text-in" : ""}`}>
                      {formatSignedMoney(Number(t.amount), t.type)}
                    </div>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      {!t.transfer_id && (
                        <button className="btn btn-icon" onClick={() => setEditing(t)} aria-label="Editar">
                          <IconEdit size={16} />
                        </button>
                      )}
                      <button className="btn btn-icon danger" onClick={() => setDeleting(t)} aria-label="Excluir">
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <div className="page-actions hide-desktop">
        <Link className="btn btn-secondary" to="/importar">
          <IconUpload size={16} /> Importar extrato
        </Link>
        {data && data.length > 0 && (
          <button className="btn btn-secondary" onClick={exportCsv}>
            <IconDownload size={16} /> Exportar CSV
          </button>
        )}
      </div>

      {editing && (
        <TransactionFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onDelete={() => {
            setDeleting(editing);
            setEditing(null);
          }}
        />
      )}

      {deleting && deleting.transfer_id && (
        <ChoiceDialog
          title="Excluir transferência?"
          description="As duas pontas são excluídas e os saldos das contas voltam ao que eram."
          busy={busy}
          onClose={() => setDeleting(null)}
          options={[
            { label: "Excluir transferência", variant: "danger", onSelect: () => handleDelete(deleting, "single") },
          ]}
        />
      )}

      {deleting && !deleting.transfer_id &&
        (isGroup(deleting) ? (
          <ChoiceDialog
            title="Excluir lançamento"
            description={
              deleting.installment_group_id
                ? `"${titleOf(deleting)}" é a parcela ${deleting.installment_number}/${deleting.installment_total} de uma compra parcelada.`
                : `"${titleOf(deleting)}" é um lançamento fixo mensal.`
            }
            busy={busy}
            onClose={() => setDeleting(null)}
            options={[
              { label: "Excluir só este", variant: "secondary", onSelect: () => handleDelete(deleting, "single") },
              { label: "Este e os próximos", variant: "secondary", onSelect: () => handleDelete(deleting, "future") },
              {
                label: deleting.installment_group_id ? "Todas as parcelas" : "Todos os meses",
                variant: "danger",
                onSelect: () => handleDelete(deleting, "all"),
              },
            ]}
          />
        ) : (
          <ChoiceDialog
            title="Excluir lançamento?"
            description={`"${titleOf(deleting)}" de ${formatMoney(Number(deleting.amount))} será excluído. Essa ação não pode ser desfeita.`}
            busy={busy}
            onClose={() => setDeleting(null)}
            options={[{ label: "Excluir", variant: "danger", onSelect: () => handleDelete(deleting, "single") }]}
          />
        ))}
    </div>
  );
}
