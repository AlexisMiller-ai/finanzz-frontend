import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Account, AccountKind, Card } from "../types";
import { formatDate, formatMonthLabel, todayISO } from "../utils/date";
import { formatMoney, numberToCents } from "../utils/money";
import { ChoiceDialog, Modal } from "../components/Modal";
import { BillsModal } from "../components/BillsModal";
import { TransferFormModal } from "../components/TransferForm";
import { CategoryIcon, EmptyState, ProgressBar, Skeleton } from "../components/ui/Common";
import { Field, FormError, MoneyInput, Segmented, SwitchRow } from "../components/ui/Form";
import {
  IconAlert,
  IconCard,
  IconPlus,
  IconRepeat,
  IconWallet,
} from "../components/ui/Icons";

interface UpcomingItem {
  tipo: "lancamento" | "fatura";
  valor: number;
  movimento: "despesa" | "receita";
  vencimento: string;
}

interface UpcomingResponse {
  vencidos: UpcomingItem[];
  proximos: UpcomingItem[];
}

const KIND_LABEL: Record<AccountKind, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro",
  investimento: "Investimento",
};

export function Accounts() {
  // A tela mostra sempre o retrato de hoje: saldo das contas agora e a fatura
  // que está aberta em cada cartão. O histórico de faturas fica em "Faturas".
  const accounts = useFetch<Account[]>("/accounts");
  const cards = useFetch<Card[]>("/cards");

  const [editingAccount, setEditingAccount] = useState<Account | "new" | null>(null);
  const [editingCard, setEditingCard] = useState<Card | "new" | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "account" | "card"; item: Account | Card } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<Account | null>(null);
  const [adjustingCard, setAdjustingCard] = useState<Card | null>(null);
  const [billsCard, setBillsCard] = useState<Card | null>(null);

  const activeAccounts = (accounts.data ?? []).filter((a) => !a.archived);
  const archivedAccounts = (accounts.data ?? []).filter((a) => a.archived);
  const activeCards = (cards.data ?? []).filter((c) => !c.archived);

  const totalContas = activeAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalFaturas = activeCards.reduce((sum, c) => sum + Math.max(c.outstanding, 0), 0);
  const vencimentos = activeCards
    .filter((c) => c.outstanding > 0 && c.openBillDueDate)
    .map((c) => c.openBillDueDate as string)
    .sort();
  const proximoVencimento = vencimentos[0];
  const ultimoVencimento = vencimentos[vencimentos.length - 1];

  // Comparar o saldo de hoje com faturas que vencem depois do salário assusta
  // à toa: a previsão soma o que entra e tira o que sai até a última fatura vencer.
  const hoje = todayISO();
  const diasAteVencer = ultimoVencimento
    ? Math.min(Math.max(Math.round((Date.parse(ultimoVencimento) - Date.parse(hoje)) / 86_400_000), 0), 90)
    : null;
  const upcoming = useFetch<UpcomingResponse>(
    diasAteVencer === null ? null : `/transactions/upcoming?days=${diasAteVencer}`,
  );
  const pendentesAteVencer = [...(upcoming.data?.vencidos ?? []), ...(upcoming.data?.proximos ?? [])].filter(
    // Faturas fechadas sem baixa já estão em "faturas a pagar".
    (item) => item.tipo === "lancamento" && (!ultimoVencimento || item.vencimento <= ultimoVencimento),
  );
  const aReceber = pendentesAteVencer.filter((i) => i.movimento === "receita").reduce((t, i) => t + i.valor, 0);
  const aPagar = pendentesAteVencer.filter((i) => i.movimento === "despesa").reduce((t, i) => t + i.valor, 0);
  const sobra = totalContas + aReceber - aPagar - totalFaturas;
  const carregando = !accounts.data || !cards.data || (diasAteVencer !== null && !upcoming.data);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contas e cartões</h1>
          <p className="page-subtitle">Quanto você tem hoje e quanto deve no cartão</p>
        </div>
        <div className="page-actions">
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
          {/* Resumo: uma resposta, não um número solto */}
          <div className="card">
            {carregando ? (
              <Skeleton height={64} />
            ) : (
              <div className="plan-grid">
                <div>
                  <div className="plan-item-label">Dinheiro nas contas</div>
                  <div className={`plan-item-value ${totalContas < 0 ? "text-out" : ""}`}>
                    {formatMoney(totalContas)}
                  </div>
                  <div className="field-hint">saldo de hoje</div>
                </div>
                <div>
                  <div className="plan-item-label">Faturas a pagar</div>
                  <div className="plan-item-value">{formatMoney(totalFaturas)}</div>
                  <div className="field-hint">
                    {proximoVencimento ? `próxima vence ${formatDate(proximoVencimento)}` : "nada em aberto"}
                  </div>
                </div>
                <div>
                  <div className="plan-item-label">
                    {ultimoVencimento ? `Sobra até ${formatDate(ultimoVencimento).slice(0, 5)}` : "Sobra depois das faturas"}
                  </div>
                  <div className={`plan-item-value ${sobra < 0 ? "text-out" : "text-in"}`}>
                    {formatMoney(sobra)}
                  </div>
                  <div className="field-hint">
                    {aReceber > 0 || aPagar > 0
                      ? [
                          aReceber > 0 && `+ ${formatMoney(aReceber)} a receber`,
                          aPagar > 0 && `− ${formatMoney(aPagar)} a pagar`,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : sobra < 0
                        ? "o dinheiro de hoje não cobre as faturas"
                        : "contas − faturas"}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-halves" style={{ alignItems: "start" }}>
            {/* Contas */}
            <div className="card card-flush">
              <div className="card-header">
                <h2 className="card-title">Contas</h2>
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
                    <div
                      key={account.id}
                      className="list-row clickable"
                      onClick={() => setEditingAccount(account)}
                    >
                      <CategoryIcon name={account.name} color={account.color} />
                      <div className="row-main">
                        <div className="row-title">
                          {account.name}
                          {account.isDefault && (
                            <span className="badge badge-primary" style={{ marginLeft: 6 }}>padrão</span>
                          )}
                        </div>
                        <div className="row-meta">{KIND_LABEL[account.kind]}</div>
                      </div>
                      <div className={`row-amount ${account.balance < 0 ? "text-out" : ""}`}>
                        {formatMoney(account.balance)}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdjusting(account);
                        }}
                        title="Informar o saldo que aparece no app do banco"
                      >
                        Ajustar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {archivedAccounts.length > 0 && (
                <div className="field-hint" style={{ padding: "4px 20px 16px" }}>
                  Arquivadas:{" "}
                  {archivedAccounts.map((account, i) => (
                    <span key={account.id}>
                      {i > 0 && ", "}
                      <button className="link-btn" onClick={() => setEditingAccount(account)}>
                        {account.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Cartões */}
            <div className="card card-flush">
              <div className="card-header">
                <h2 className="card-title">Cartões de crédito</h2>
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
                    <CardRow
                      key={card.id}
                      card={card}
                      onEdit={() => setEditingCard(card)}
                      onOpenBills={() => setBillsCard(card)}
                    />
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
          onDelete={
            editingAccount === "new"
              ? undefined
              : () => {
                  setDeleting({ kind: "account", item: editingAccount });
                  setEditingAccount(null);
                }
          }
        />
      )}
      {editingCard && (
        <CardModal
          card={editingCard === "new" ? null : editingCard}
          accounts={activeAccounts}
          onClose={() => setEditingCard(null)}
          onDelete={
            editingCard === "new"
              ? undefined
              : () => {
                  setDeleting({ kind: "card", item: editingCard });
                  setEditingCard(null);
                }
          }
          onAdjustOutstanding={
            editingCard === "new"
              ? undefined
              : () => {
                  setAdjustingCard(editingCard);
                  setEditingCard(null);
                }
          }
        />
      )}
      {deleting && <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />}
      {transferOpen && <TransferFormModal onClose={() => setTransferOpen(false)} />}
      {adjusting && <AdjustBalanceModal account={adjusting} onClose={() => setAdjusting(null)} />}
      {billsCard && (
        <BillsModal card={billsCard} accounts={activeAccounts} onClose={() => setBillsCard(null)} />
      )}
      {adjustingCard && (
        <AdjustOutstandingModal card={adjustingCard} onClose={() => setAdjustingCard(null)} />
      )}
    </div>
  );
}

/**
 * Um cartão: em destaque só a fatura atual e quando vence. O resto aparece
 * apenas quando existe (fatura atrasada, limite, parcelas futuras).
 */
function CardRow({
  card,
  onEdit,
  onOpenBills,
}: {
  card: Card;
  onEdit: () => void;
  onOpenBills: () => void;
}) {
  const mesFatura = formatMonthLabel(card.openBillMonth).split(" ")[0]?.toLowerCase();
  const usoLimite = card.limitAmount ? (card.outstanding / card.limitAmount) * 100 : 0;

  return (
    <div className="list-row clickable" style={{ alignItems: "flex-start" }} onClick={onEdit}>
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
            <strong>{formatMoney(card.openBillTotal)}</strong>
          </span>
        </div>

        <div className="row-meta" style={{ justifyContent: "space-between" }}>
          <span>
            {card.openBillPaid ? (
              <>fatura de {mesFatura} paga ✓</>
            ) : (
              <>
                fatura de {mesFatura}
                {card.openBillDueDate ? ` · vence ${formatDate(card.openBillDueDate)}` : ""}
              </>
            )}
          </span>
          <button
            type="button"
            className="link-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBills();
            }}
          >
            Faturas
          </button>
        </div>

        {card.closedDue > 0 && (
          <div className="row-meta">
            <span style={{ color: "var(--out-text)" }}>
              + {formatMoney(card.closedDue)} de{" "}
              {card.closedUnpaidCount === 1 ? "fatura fechada" : "faturas fechadas"} sem baixa
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenBills();
              }}
            >
              dar baixa
            </button>
          </div>
        )}

        {card.limitAmount ? (
          <div style={{ marginTop: 8 }}>
            <ProgressBar percent={usoLimite} tone={usoLimite > 90 ? "bad" : undefined} />
            <div className="row-meta">
              {formatMoney(card.outstanding)} de {formatMoney(card.limitAmount)} do limite
              {card.futureInstallments > 0 &&
                ` · mais ${formatMoney(card.futureInstallments)} em parcelas futuras`}
            </div>
          </div>
        ) : (
          card.futureInstallments > 0 && (
            <div className="row-meta">
              mais {formatMoney(card.futureInstallments)} em parcelas futuras
            </div>
          )
        )}
      </div>
    </div>
  );
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

function AccountModal({
  account,
  onClose,
  onDelete,
}: {
  account: Account | null;
  onClose: () => void;
  onDelete?: () => void;
}) {
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
        <>
          {onDelete && (
            <button type="button" className="btn btn-danger-ghost" style={{ marginRight: "auto" }} onClick={onDelete}>
              Excluir
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : "Salvar"}
          </button>
        </>
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
  onDelete,
  onAdjustOutstanding,
}: {
  card: Card | null;
  accounts: Account[];
  onClose: () => void;
  onDelete?: () => void;
  onAdjustOutstanding?: () => void;
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
        <>
          {onDelete && (
            <button type="button" className="btn btn-danger-ghost" style={{ marginRight: "auto" }} onClick={onDelete}>
              Excluir
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : "Salvar"}
          </button>
        </>
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
        {onAdjustOutstanding && (
          <button type="button" className="link-btn" style={{ alignSelf: "flex-start" }} onClick={onAdjustOutstanding}>
            Corrigir o valor que o cartão deve hoje
          </button>
        )}
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
