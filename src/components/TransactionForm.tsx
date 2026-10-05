import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Account, Card, Category, EditScope, PaymentMethod, Transaction, TransactionType } from "../types";
import { formatMonthShort, getCurrentMonth, shiftMonth, todayISO } from "../utils/date";
import { formatMoney, numberToCents } from "../utils/money";
import { pickDefault, setLastUsed } from "../utils/preferences";
import { Modal } from "./Modal";
import { Field, FormError, MoneyInput, Segmented, SwitchRow } from "./ui/Form";
import { IconInfo } from "./ui/Icons";

type Mode = "single" | "installments" | "recurring";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Pix/Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
];

const INSTALLMENT_SUFFIX = /\s*\(\d+\/\d+\)$/;

/** Mês da fatura sugerido: compras a partir do dia de fechamento vão para a fatura seguinte. */
function suggestBillingMonth(purchaseDate: string, closingDay: number | null): string {
  const month = purchaseDate.slice(0, 7) || getCurrentMonth();
  const day = Number(purchaseDate.slice(8, 10));
  return closingDay && day >= closingDay ? shiftMonth(month, 1) : month;
}

interface Props {
  editing?: Transaction | null;
  onClose: () => void;
  onDelete?: () => void;
}

export function TransactionFormModal({ editing, onClose, onDelete }: Props) {
  const { notifyDataChanged, month } = useApp();
  const toast = useToast();
  const { data: categories = [] } = useFetch<Category[]>("/categories");
  const { data: accounts = [] } = useFetch<Account[]>("/accounts");
  const { data: cards = [] } = useFetch<Card[]>("/cards");

  const isEditing = !!editing;
  const isGroup = !!(editing?.installment_group_id || editing?.recurrence_id);

  // Novo lançamento em outro mês começa naquele mês, e não em "hoje".
  const initialDate = month === getCurrentMonth() ? todayISO() : `${month}-01`;

  const [type, setType] = useState<TransactionType>(editing?.type ?? "despesa");
  const [cents, setCents] = useState(editing ? numberToCents(editing.amount) : 0);
  const [categoryId, setCategoryId] = useState<number | "" | null>(
    editing ? (editing.category_id ?? "") : null,
  );
  const [description, setDescription] = useState(
    (editing?.description ?? "").replace(INSTALLMENT_SUFFIX, ""),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.payment_method ?? "dinheiro",
  );
  const [purchaseDate, setPurchaseDate] = useState(
    editing ? (editing.payment_method === "credito" ? editing.purchase_date || editing.date : editing.date) : initialDate,
  );
  const [billingOverride, setBillingOverride] = useState<string | null>(
    editing?.payment_method === "credito" ? editing.date.slice(0, 7) : null,
  );
  const [accountId, setAccountId] = useState<number | "" | null>(editing?.account_id ?? null);
  const [cardId, setCardId] = useState<number | "" | null>(editing?.card_id ?? null);
  const [mode, setMode] = useState<Mode>("single");
  const [installmentsInput, setInstallmentsInput] = useState("2");
  const [repeatInput, setRepeatInput] = useState("12");
  const [scope, setScope] = useState<EditScope>("single");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = segue a data (futuro nasce a pagar, passado nasce pago).
  const [settledChoice, setSettledChoice] = useState<boolean | null>(
    editing ? editing.settled !== false : null,
  );

  const isCredit = type === "despesa" && paymentMethod === "credito";
  const settled = settledChoice ?? purchaseDate <= todayISO();
  const activeAccounts = accounts.filter((a) => !a.archived || a.id === editing?.account_id);
  const activeCards = cards.filter((c) => !c.archived || c.id === editing?.card_id);
  const effectiveAccountId =
    accountId === null ? pickDefault(activeAccounts, "account") : accountId;
  const effectiveCardId = cardId === null ? pickDefault(activeCards, "card") : cardId;
  const selectedCard = activeCards.find((c) => c.id === effectiveCardId);
  const billingMonth = billingOverride ?? suggestBillingMonth(purchaseDate, selectedCard?.closingDay ?? null);
  const typeCategories = categories.filter((c) => c.type === type);
  const effectiveCategoryId =
    categoryId === null ? (typeCategories[0]?.id ?? "") : categoryId;
  const effectiveMode: Mode = type === "receita" && mode === "installments" ? "single" : mode;
  const installments = Number(installmentsInput) || 0;
  const repeatMonths = Number(repeatInput) || 0;

  function changeType(next: TransactionType) {
    setType(next);
    if (!isEditing || next !== editing?.type) setCategoryId(null);
    if (next === "receita" && paymentMethod === "credito") setPaymentMethod("dinheiro");
  }

  async function save(keepOpen: boolean) {
    setError(null);

    if (cents <= 0) return setError("Informe um valor maior que zero.");
    if (!purchaseDate) return setError("Informe a data.");
    if (effectiveMode === "installments" && (installments < 2 || installments > 72)) {
      return setError("O número de parcelas deve ficar entre 2 e 72.");
    }
    if (effectiveMode === "recurring" && (repeatMonths < 2 || repeatMonths > 60)) {
      return setError("A repetição deve ficar entre 2 e 60 meses.");
    }

    const payload: Record<string, unknown> = {
      amount: cents / 100,
      type,
      category_id: effectiveCategoryId || null,
      description: description.trim() || null,
      date: isCredit ? `${billingMonth}-01` : purchaseDate,
      purchase_date: purchaseDate,
      payment_method: type === "receita" ? "dinheiro" : paymentMethod,
      ...(isCredit
        ? { card_id: effectiveCardId || null }
        : { account_id: effectiveAccountId || null, settled }),
    };

    if (!isEditing && effectiveMode === "installments") {
      payload.is_installment = true;
      payload.installments = installments;
    }
    if (!isEditing && effectiveMode === "recurring") {
      payload.repeat_months = repeatMonths;
    }
    if (isEditing && isGroup) payload.scope = scope;

    setSaving(true);
    try {
      if (editing) {
        const res = await api.put<{ transactions: Transaction[] }>(`/transactions/${editing.id}`, payload);
        const count = res.data.transactions.length;
        toast(count > 1 ? `${count} lançamentos atualizados` : "Lançamento atualizado");
      } else {
        const res = await api.post<{ transactions: Transaction[] }>("/transactions", payload);
        const count = res.data.transactions.length;
        toast(count > 1 ? `${count} lançamentos criados` : "Lançamento adicionado");
      }
      // Lembra a escolha para o próximo lançamento neste navegador.
      setLastUsed(isCredit ? "card" : "account", (isCredit ? effectiveCardId : effectiveAccountId) || null);
      notifyDataChanged();

      if (keepOpen) {
        setCents(0);
        setDescription("");
        setMode("single");
        setSaving(false);
        document.getElementById("tx-amount")?.focus();
      } else {
        onClose();
      }
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível salvar o lançamento."));
      setSaving(false);
    }
  }

  const perInstallment = installments >= 2 ? Math.floor(cents / installments) : cents;
  const title = isEditing ? "Editar lançamento" : "Novo lançamento";

  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      footer={
        <>
          {onDelete && (
            <button type="button" className="btn btn-danger-ghost" style={{ marginRight: "auto" }} onClick={onDelete}>
              Excluir
            </button>
          )}
          {!isEditing && (
            <button type="button" className="btn btn-ghost hide-mobile" disabled={saving} onClick={() => save(true)}>
              Salvar e adicionar outro
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : isEditing ? "Salvar alterações" : "Adicionar"}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Segmented
          className="type"
          label="Tipo"
          value={type}
          onChange={changeType}
          options={[
            { value: "despesa", label: "Despesa" },
            { value: "receita", label: "Receita" },
          ]}
        />

        <Field label={effectiveMode === "installments" ? "Valor total da compra" : "Valor"} htmlFor="tx-amount">
          <MoneyInput id="tx-amount" cents={cents} onChange={setCents} large autoFocus />
        </Field>

        <Field label="Descrição" htmlFor="tx-description">
          <input
            id="tx-description"
            className="input"
            placeholder={type === "despesa" ? "Ex.: Mercado, Uber, Netflix" : "Ex.: Salário, Freela"}
            value={description}
            maxLength={240}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Categoria" htmlFor="tx-category">
          <select
            id="tx-category"
            className="select"
            value={effectiveCategoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Sem categoria</option>
            {typeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {type === "despesa" && (
          <Field label="Forma de pagamento">
            <Segmented
              label="Forma de pagamento"
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={PAYMENT_OPTIONS}
            />
          </Field>
        )}

        {isCredit ? (
          <Field label="Cartão" htmlFor="tx-card">
            <select
              id="tx-card"
              className="select"
              value={effectiveCardId}
              onChange={(e) => setCardId(e.target.value ? Number(e.target.value) : "")}
            >
              {activeCards.length === 0 && <option value="">Cartão de crédito</option>}
              {activeCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Conta" htmlFor="tx-account">
            <select
              id="tx-account"
              className="select"
              value={effectiveAccountId}
              onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : "")}
            >
              {activeAccounts.length === 0 && <option value="">Conta principal</option>}
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="field-row">
          <Field label={isCredit ? "Data da compra" : "Data"} htmlFor="tx-date">
            <input
              id="tx-date"
              type="date"
              className="input"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              disabled={isEditing && isGroup && scope !== "single"}
            />
          </Field>
          {isCredit && (
            <Field label={effectiveMode === "installments" ? "Fatura da 1ª parcela" : "Fatura"} htmlFor="tx-billing">
              <input
                id="tx-billing"
                type="month"
                className="input"
                value={billingMonth}
                onChange={(e) => setBillingOverride(e.target.value || null)}
                disabled={isEditing && isGroup && scope !== "single"}
              />
            </Field>
          )}
        </div>

        {!isEditing && (
          <Field label="Repetição">
            <Segmented
              label="Repetição"
              value={effectiveMode}
              onChange={setMode}
              options={
                type === "despesa"
                  ? [
                      { value: "single", label: "Única" },
                      { value: "installments", label: "Parcelada" },
                      { value: "recurring", label: "Fixa mensal" },
                    ]
                  : [
                      { value: "single", label: "Única" },
                      { value: "recurring", label: "Fixa mensal" },
                    ]
              }
            />
          </Field>
        )}

        {!isEditing && effectiveMode === "installments" && (
          <Field
            label="Número de parcelas"
            htmlFor="tx-installments"
            hint={
              cents > 0 &&
              installments >= 2 &&
              `${installments}x de ${formatMoney(perInstallment / 100)}${
                cents % installments ? ` (última ${formatMoney((perInstallment + (cents % installments)) / 100)})` : ""
              } · ${formatMonthShort(isCredit ? billingMonth : purchaseDate, true)} a ${formatMonthShort(
                shiftMonth((isCredit ? billingMonth : purchaseDate).slice(0, 7), installments - 1),
                true,
              )}`
            }
          >
            <input
              id="tx-installments"
              type="number"
              className="input"
              min={2}
              max={72}
              value={installmentsInput}
              onChange={(e) => setInstallmentsInput(e.target.value)}
            />
          </Field>
        )}

        {!isEditing && effectiveMode === "recurring" && (
          <Field
            label="Repetir por quantos meses"
            htmlFor="tx-repeat"
            hint={
              cents > 0 &&
              repeatMonths >= 2 &&
              `${repeatMonths} lançamentos de ${formatMoney(cents / 100)}, de ${formatMonthShort(
                isCredit ? billingMonth : purchaseDate,
                true,
              )} a ${formatMonthShort(shiftMonth((isCredit ? billingMonth : purchaseDate).slice(0, 7), repeatMonths - 1), true)}`
            }
          >
            <input
              id="tx-repeat"
              type="number"
              className="input"
              min={2}
              max={60}
              value={repeatInput}
              onChange={(e) => setRepeatInput(e.target.value)}
            />
          </Field>
        )}

        {isEditing && isGroup && (
          <Field
            label={
              editing?.installment_group_id
                ? `Parcela ${editing.installment_number}/${editing.installment_total} — aplicar em`
                : "Lançamento fixo mensal — aplicar em"
            }
            hint={scope !== "single" ? "Em lote, a data de cada mês é mantida." : undefined}
          >
            <Segmented
              label="Aplicar em"
              value={scope}
              onChange={setScope}
              options={[
                { value: "single", label: "Só este" },
                { value: "future", label: "Este e próximos" },
                { value: "all", label: "Todos" },
              ]}
            />
          </Field>
        )}

        {!isCredit && (
          <SwitchRow
            title={type === "receita" ? "Já recebi" : "Já paguei"}
            description={
              settled
                ? "Entra no saldo da conta."
                : "Fica em \"a pagar e a receber\" e só entra no saldo depois da baixa."
            }
            checked={settled}
            onChange={setSettledChoice}
          />
        )}
        {isCredit && !isEditing && selectedCard && !selectedCard.closingDay && (
          <div className="alert alert-info">
            <IconInfo size={16} />
            <span>
              Informe o dia de fechamento em Contas e cartões para a fatura ser sugerida automaticamente.
            </span>
          </div>
        )}

        <FormError message={error} />
      </div>
    </Modal>
  );
}
