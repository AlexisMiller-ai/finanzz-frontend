import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Account, AccountKind, Card } from "../types";
import { formatDate, formatMonthLabel, formatMonthShort } from "../utils/date";
import { formatMoney, numberToCents } from "../utils/money";
import { ChoiceDialog, Modal } from "../components/Modal";
import { BillsModal } from "../components/BillsModal";
import { TransferFormModal } from "../components/TransferForm";
import { CategoryIcon, EmptyState, MonthSwitcher, ProgressBar, Skeleton } from "../components/ui/Common";
import { Field, FormError, MoneyInput, Segmented, SwitchRow } from "../components/ui/Form";
import {
  IconAlert,
  IconCalendar,
  IconCard,
  IconEdit,
  IconPlus,
  IconRepeat,
  IconTarget,
  IconTrash,
  IconWallet,
} from "../components/ui/Icons";

const KIND_LABEL: Record<AccountKind, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  investimento: "Investimento",
};

export function Accounts() {
  const { month } = useApp();
  const accounts = useFetch<Account[]>("/accounts");
  const cards = useFetch<Card[]>(`/cards?month=${month}`);

  const [editingAccount, setEditingAccount] = useState<Account | "new" | null>(null);
  const [editingCard, setEditingCard] = useState<Card | "new" | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "account" | "card"; item: Account | Card } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<Account | null>(null);
  const [adjustingCard, setAdjustingCard] = useState<Card | null>(null);
  const [billsCard, setBillsCard] = useState<Card | null>(null);

  const activeAccounts = (accounts.data ?? []).filter((a) => !a.archived);
  const archivedAccounts = (accounts.data ?? []).filter((a) => a.archived);
  const total = activeAccounts.reduce((sum, a) => sum + a.balance, 0);
  const activeCards = (cards.data ?? []).filter((c) => !c.archived);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas e cartões</h1>
          <p className="page-subtitle">Onde seu dinheiro está e quanto você deve no cartão</p>
        </div>
        <div className="page-actions">
          <MonthSwitcher />
          <button className="btn btn-secondary" onClick={() => setTransferOpen(true)}>
            <IconRepeat size={16} /> Transferir
          </button>
        </div>
      </div>

      {accounts.error && !accounts.data ? (
        <div className="card">
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível carregar as contas"
            description={accounts.error}
            action={
              <button className="btn btn-secondary" onClick={accounts.reload}>
                Tentar novamente
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="card">
            <div className="plan-item-label">Saldo total em contas</div>
            <div className="kpi-value" style={{ fontSize: 30 }}>
              {accounts.data ? formatMoney(total) : <Skeleton width={180} height={30} />}
            </div>
            <div className="field-hint">
              Soma das contas ativas, considerando lançamentos até hoje. Se não bater com o app do
              banco, use o botão de ajustar saldo na conta.
            </div>
          </div>

          <div className="grid grid-halves" style={{ alignItems: "start" }}>
            {/* Contas */}
            <div className="card card-flush">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Contas</h2>
                  <p className="card-subtitle">{activeAccounts.length} ativas</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingAccount("new")}>
                  <IconPlus size={14} /> Nova conta
                </button>
              </div>

              {!accounts.data ? (
                <div style={{ padding: 20 }}>
                  <Skeleton height={120} />
                </div>
              ) : activeAccounts.length === 0 ? (
                <EmptyState icon={<IconWallet />} title="Nenhuma conta ativa" />
              ) : (
                <div className="list" style={{ paddingBottom: 6 }}>
                  {activeAccounts.map((account) => (
                    <div key={account.id} className="list-row clickable" onClick={() => setEditingAccount(account)}>
                      <CategoryIcon name={account.name} color={account.color} />
                      <div className="row-main">
                        <div className="row-title">{account.name}</div>
                        <div className="row-meta">
                          {KIND_LABEL[account.kind]} · {account.transactionCount}{" "}
                          {account.transactionCount === 1 ? "lançamento" : "lançamentos"}
                          {account.isDefault && <span className="badge badge-primary">padrão</span>}
                        </div>
                      </div>
                      <div className={`row-amount ${account.balance < 0 ? "text-out" : ""}`}>
                        {formatMoney(account.balance)}
                      </div>
                      <div className="row-actions" style={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-icon"
                          onClick={() => setAdjusting(account)}
                          aria-label={`Ajustar saldo de ${account.name}`}
                          title="Ajustar saldo"
                        >
                          <IconTarget size={16} />
                        </button>
                        <button className="btn btn-icon" onClick={() => setEditingAccount(account)} aria-label={`Editar ${account.name}`}>
                          <IconEdit size={16} />
                        </button>
                        <button
                          className="btn btn-icon danger"
                          onClick={() => setDeleting({ kind: "account", item: account })}
                          aria-label={`Excluir ${account.name}`}
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {archivedAccounts.length > 0 && (
                <div style={{ padding: "10px 20px 16px" }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>Arquivadas</div>
                  {archivedAccounts.map((account) => (
                    <div key={account.id} className="row-meta" style={{ justifyContent: "space-between" }}>
                      <button className="link-btn" onClick={() => setEditingAccount(account)}>
                        {account.name}
                      </button>
                      <span>{formatMoney(account.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cartões */}
            <div className="card card-flush">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Cartões de crédito</h2>
                  <p className="card-subtitle">Fatura de {formatMonthLabel(month).toLowerCase()}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingCard("new")}>
                  <IconPlus size={14} /> Novo cartão
                </button>
              </div>

              {!cards.data ? (
                <div style={{ padding: 20 }}>
                  <Skeleton height={120} />
                </div>
              ) : activeCards.length === 0 ? (
                <EmptyState
                  icon={<IconCard />}
                  title="Nenhum cartão cadastrado"
                  description="Cadastre para acompanhar a fatura e o dia de fechamento."
                />
              ) : (
                <div className="list" style={{ paddingBottom: 6 }}>
                  {activeCards.map((card) => (
                    <div key={card.id} className="list-row clickable" style={{ alignItems: "flex-start" }} onClick={() => setEditingCard(card)}>
                      <CategoryIcon name={card.name} color={card.color} />
                      <div className="row-main">
                        <div className="category-bar-top">
                          <span className="row-title">
                            {card.name}
                            {card.isDefault && (
                              <span className="badge badge-primary" style={{ marginLeft: 6 }}>padrão</span>
                            )}
                          </span>
                          <span className="nowrap tabular">
                            <strong>{formatMoney(card.billTotal)}</strong>
                          </span>
                        </div>
                        {card.limitAmount ? (
                          <>
                            <ProgressBar
                              percent={(card.outstanding / card.limitAmount) * 100}
                              tone={card.outstanding / card.limitAmount > 0.9 ? "bad" : undefined}
                            />
                            <div className="row-meta" style={{ justifyContent: "space-between" }}>
                              <span>
                                {formatMoney(card.outstanding)} em aberto de {formatMoney(card.limitAmount)}
                              </span>
                              <span>{cardDaysLabel(card)}</span>
                            </div>
                            <CardBillLines card={card} onOpenBills={() => setBillsCard(card)} />
                          </>
                        ) : (
                          <>
                            <div className="row-meta">
                              {formatMoney(card.outstanding)} em aberto · {cardDaysLabel(card)}
                            </div>
                            <CardBillLines card={card} onOpenBills={() => setBillsCard(card)} />
                          </>
                        )}
                      </div>
                      <div className="row-actions" style={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-icon"
                          onClick={() => setBillsCard(card)}
                          aria-label={`Faturas de ${card.name}`}
                          title="Faturas e baixa de pagamento"
                        >
                          <IconCalendar size={16} />
                        </button>
                        <button
                          className="btn btn-icon"
                          onClick={() => setAdjustingCard(card)}
                          aria-label={`Ajustar fatura em aberto de ${card.name}`}
                          title="Ajustar o que deve hoje"
                        >
                          <IconTarget size={16} />
                        </button>
                        <button className="btn btn-icon" onClick={() => setEditingCard(card)} aria-label={`Editar ${card.name}`}>
                          <IconEdit size={16} />
                        </button>
                        <button
                          className="btn btn-icon danger"
                          onClick={() => setDeleting({ kind: "card", item: card })}
                          aria-label={`Excluir ${card.name}`}
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {editingAccount && (
        <AccountModal
          account={editingAccount === "new" ? null : editingAccount}
          onClose={() => setEditingAccount(null)}
        />
      )}
      {editingCard && (
        <CardModal
          card={editingCard === "new" ? null : editingCard}
          accounts={activeAccounts}
          onClose={() => setEditingCard(null)}
        />
      )}
      {deleting && <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />}
      {transferOpen && <TransferFormModal onClose={() => setTransferOpen(false)} />}
      {adjusting && <AdjustBalanceModal account={adjusting} onClose={() => setAdjusting(null)} />}
      {billsCard && (
        <BillsModal
          card={billsCard}
          accounts={activeAccounts}
          onClose={() => setBillsCard(null)}
        />
      )}
      {adjustingCard && (
        <AdjustOutstandingModal card={adjustingCard} onClose={() => setAdjustingCard(null)} />
      )}
    </div>
  );
}

/**
 * Resumo das faturas do cartão: a que está aberta (pelo dia de fechamento),
 * as que já fecharam e seguem sem baixa, e as parcelas que ainda vão cair.
 */
function CardBillLines({ card, onOpenBills }: { card: Card; onOpenBills: () => void }) {
  const count = card.closedUnpaidCount;
  return (
    <>
      <div className="row-meta">
        Fatura aberta de {formatMonthShort(`${card.openBillMonth}-01`, true)}:{" "}
        {formatMoney(card.openBillTotal)}
        {card.openBillDueDate && ` · vence ${formatDate(card.openBillDueDate)}`}
      </div>
      {card.closedDue > 0 && (
        <div className="row-meta">
          <span style={{ color: "var(--danger)" }}>
            {count > 0
              ? `${count} ${count === 1 ? "fatura que já fechou" : "faturas que já fecharam"} sem baixa: `
              : "De faturas que já fecharam: "}
            {formatMoney(card.closedDue)}
          </span>
          <button
            type="button"
            className="link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBills();
            }}
          >
            já paguei
          </button>
        </div>
      )}
      {card.futureInstallments > 0 && (
        <div className="row-meta">
          + {formatMoney(card.futureInstallments)} em parcelas de faturas futuras
        </div>
      )}
    </>
  );
}

function cardDaysLabel(card: Card) {
  const parts: string[] = [];
  if (card.closingDay) parts.push(`fecha dia ${card.closingDay}`);
  if (card.dueDay) parts.push(`vence dia ${card.dueDay}`);
  return parts.join(" · ") || "sem datas definidas";
}

function AdjustBalanceModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [cents, setCents] = useState(numberToCents(account.balance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/accounts/${account.id}/balance`, { current_balance: cents / 100 });
      toast("Saldo ajustado");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Ajustar saldo · ${account.name}`}
      description="Informe quanto você tem nessa conta hoje, como está no app do banco. O saldo inicial é recalculado para bater, e os próximos lançamentos continuam somando a partir daí."
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : "Ajustar"}
        </button>
      }
    >
      <div className="form-stack">
        <Field label="Saldo de hoje" htmlFor="adj-balance" hint="Para conta negativa, digite um sinal de menos.">
          <MoneyInput id="adj-balance" cents={cents} onChange={setCents} large autoFocus allowNegative />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function AdjustOutstandingModal({ card, onClose }: { card: Card; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [cents, setCents] = useState(numberToCents(card.outstanding));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/cards/${card.id}/outstanding`, { current_outstanding: cents / 100 });
      toast("Fatura em aberto ajustada");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Fatura em aberto · ${card.name}`}
      description="Informe quanto você deve nesse cartão hoje. Use quando faturas antigas já foram pagas fora do app, ou depois de mover compras entre cartões."
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : "Ajustar"}
        </button>
      }
    >
      <div className="form-stack">
        <Field
          label="Valor devido hoje"
          htmlFor="adj-outstanding"
          hint={
            <>
              Fatura deste mês: {formatMoney(card.billTotal)}. Se as anteriores já estão pagas, esse
              costuma ser o valor certo.
              {card.outstandingAdjustment !== 0 && (
                <> Ajuste atual: {formatMoney(card.outstandingAdjustment)}.</>
              )}
            </>
          }
        >
          <MoneyInput id="adj-outstanding" cents={cents} onChange={setCents} large autoFocus />
        </Field>
        <button
          type="button"
          className="link-btn"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setCents(numberToCents(card.billTotal))}
        >
          Usar a fatura deste mês ({formatMoney(card.billTotal)})
        </button>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function AccountModal({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "corrente");
  const [cents, setCents] = useState(numberToCents(account?.initialBalance ?? 0));
  const [archived, setArchived] = useState(account?.archived ?? false);
  const [isDefault, setIsDefault] = useState(account?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome da conta.");
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        kind,
        initial_balance: cents / 100,
        archived,
        is_default: isDefault,
      };
      if (account) await api.put(`/accounts/${account.id}`, payload);
      else await api.post("/accounts", payload);
      toast(account ? "Conta atualizada" : "Conta criada");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={account ? "Editar conta" : "Nova conta"}
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
        <Field label="Nome" htmlFor="acc-name">
          <input
            id="acc-name"
            className="input"
            value={name}
            maxLength={50}
            placeholder="Ex.: Nubank, Carteira"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Tipo">
          <Segmented<AccountKind>
            label="Tipo da conta"
            value={kind}
            onChange={setKind}
            options={[
              { value: "corrente", label: "Corrente" },
              { value: "poupanca", label: "Poupança" },
              { value: "dinheiro", label: "Dinheiro" },
              { value: "investimento", label: "Investir" },
            ]}
          />
        </Field>
        <Field
          label="Saldo inicial"
          htmlFor="acc-balance"
          hint={
            account
              ? "Quanto havia antes do primeiro lançamento. Mudar isso desloca o saldo atual."
              : "Quanto você tem nessa conta hoje. Os próximos lançamentos partem daqui."
          }
        >
          <MoneyInput id="acc-balance" cents={cents} onChange={setCents} allowNegative />
        </Field>
        <SwitchRow
          title="Usar como padrão"
          description="Vem pré-selecionada ao criar um lançamento, em qualquer dispositivo."
          checked={isDefault}
          onChange={setIsDefault}
        />
        {account && (
          <SwitchRow
            title="Arquivar conta"
            description="Some das listas e do saldo total, sem apagar os lançamentos."
            checked={archived}
            onChange={setArchived}
          />
        )}
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function CardModal({
  card,
  accounts,
  onClose,
}: {
  card: Card | null;
  accounts: Account[];
  onClose: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [name, setName] = useState(card?.name ?? "");
  const [closingDay, setClosingDay] = useState(card?.closingDay ? String(card.closingDay) : "");
  const [dueDay, setDueDay] = useState(card?.dueDay ? String(card.dueDay) : "");
  const [limit, setLimit] = useState(numberToCents(card?.limitAmount ?? 0));
  const [paymentAccountId, setPaymentAccountId] = useState<number | "">(card?.paymentAccountId ?? "");
  const [archived, setArchived] = useState(card?.archived ?? false);
  const [cardIsDefault, setCardIsDefault] = useState(card?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome do cartão.");
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        closing_day: closingDay || null,
        due_day: dueDay || null,
        limit_amount: limit > 0 ? limit / 100 : null,
        payment_account_id: paymentAccountId || null,
        archived,
        is_default: cardIsDefault,
      };
      if (card) await api.put(`/cards/${card.id}`, payload);
      else await api.post("/cards", payload);
      toast(card ? "Cartão atualizado" : "Cartão criado");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={card ? "Editar cartão" : "Novo cartão"}
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
        <Field label="Nome" htmlFor="card-name">
          <input
            id="card-name"
            className="input"
            value={name}
            maxLength={50}
            placeholder="Ex.: Nubank Roxinho"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="field-row">
          <Field
            label="Dia de fechamento"
            htmlFor="card-closing"
            hint="Compras a partir desse dia caem na fatura seguinte."
          >
            <input
              id="card-closing"
              className="input"
              type="number"
              min={1}
              max={31}
              placeholder="25"
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
            />
          </Field>
          <Field label="Dia de vencimento" htmlFor="card-due">
            <input
              id="card-due"
              className="input"
              type="number"
              min={1}
              max={31}
              placeholder="5"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Limite" htmlFor="card-limit" hint="Opcional. Deixe zerado se não quiser acompanhar.">
          <MoneyInput id="card-limit" cents={limit} onChange={setLimit} />
        </Field>
        <Field label="Conta que paga a fatura" htmlFor="card-account">
          <select
            id="card-account"
            className="select"
            value={paymentAccountId}
            onChange={(e) => setPaymentAccountId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Não definida</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <SwitchRow
          title="Usar como padrão"
          description="Vem pré-selecionado nas compras no crédito, em qualquer dispositivo."
          checked={cardIsDefault}
          onChange={setCardIsDefault}
        />
        {card && (
          <SwitchRow
            title="Arquivar cartão"
            description="Some das listas, sem apagar os lançamentos."
            checked={archived}
            onChange={setArchived}
          />
        )}
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function DeleteDialog({
  target,
  onClose,
}: {
  target: { kind: "account" | "card"; item: Account | Card };
  onClose: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isAccount = target.kind === "account";
  const used = target.item.transactionCount;

  async function handleDelete() {
    setBusy(true);
    try {
      await api.delete(`/${isAccount ? "accounts" : "cards"}/${target.item.id}`);
      toast(isAccount ? "Conta excluída" : "Cartão excluído");
      notifyDataChanged();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <ChoiceDialog
      title={`Excluir ${target.item.name}?`}
      description={
        used > 0
          ? `Tem ${used} lançamentos. Nesse caso o ideal é arquivar (na edição), não excluir.`
          : `Sem lançamentos. Pode excluir sem perder nada.`
      }
      busy={busy}
      onClose={onClose}
      options={[{ label: "Excluir", variant: "danger", onSelect: handleDelete }]}
    />
  );
}
