import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Account, Bill, BillPaymentKind, BillsResponse, Card } from "../types";
import { formatDate, formatMonthLabel, todayISO } from "../utils/date";
import { formatMoney, numberToCents } from "../utils/money";
import { Modal } from "./Modal";
import { EmptyState, Skeleton } from "./ui/Common";
import { Field, FormError, MoneyInput, Segmented } from "./ui/Form";
import { IconAlert, IconCard } from "./ui/Icons";

const STATUS_BADGE: Record<Bill["status"], { label: string; className: string }> = {
  paga: { label: "paga", className: "badge badge-in" },
  fechada: { label: "a pagar", className: "badge badge-warning" },
  aberta: { label: "aberta", className: "badge badge-primary" },
  futura: { label: "futura", className: "badge" },
};

const KIND_LABEL: Record<BillPaymentKind, string> = {
  transferencia: "paga pela conta",
  externo: "paga fora do app",
  lancado: "pagamento já lançado",
};

/**
 * Faturas de um cartão, mês a mês. É aqui que a fatura que fechou deixa de
 * contar como dívida: a baixa pode criar o pagamento saindo da conta, ou só
 * registrar que ela já foi paga fora do app.
 */
export function BillsModal({
  card,
  accounts,
  onClose,
}: {
  card: Card;
  accounts: Account[];
  onClose: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const { data, error, reload } = useFetch<BillsResponse>(`/cards/${card.id}/bills`);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const bills = data?.bills ?? [];
  const pending = bills.filter((bill) => bill.status === "fechada");

  async function undo(bill: Bill) {
    setBusy(bill.month);
    setActionError(null);
    try {
      const res = await api.delete<{ transferRemoved: number }>(
        `/cards/${card.id}/bills/${bill.month}/pay`,
      );
      toast(
        res.data.transferRemoved > 0
          ? "Baixa desfeita e pagamento removido dos lançamentos"
          : "Baixa desfeita",
      );
      notifyDataChanged();
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function settlePast() {
    setBusy("past");
    setActionError(null);
    try {
      const res = await api.post<{ settled: number }>(`/cards/${card.id}/bills/settle-past`);
      toast(`${res.data.settled} faturas anteriores marcadas como pagas`);
      notifyDataChanged();
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Modal
        title={`Faturas · ${card.name}`}
        description="A fatura que fechou sai da dívida quando você dá baixa nela. O que fica em aberto é a fatura atual, pelo dia de fechamento do cartão."
        onClose={onClose}
        size="md"
        footer={
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        }
      >
        {error && !data ? (
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível carregar as faturas"
            description={error}
            action={
              <button className="btn btn-secondary" onClick={reload}>
                Tentar novamente
              </button>
            }
          />
        ) : !data ? (
          <div className="form-stack">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={52} />
            ))}
          </div>
        ) : bills.length === 0 ? (
          <EmptyState
            icon={<IconCard />}
            title="Nenhuma fatura ainda"
            description="Assim que houver compras no cartão, elas aparecem aqui agrupadas por fatura."
          />
        ) : (
          <>
            {pending.length > 1 && (
              <div className="alert alert-info" style={{ marginBottom: 12 }}>
                <IconAlert size={16} />
                <span>
                  {pending.length} faturas já fecharam e seguem como dívida. Se todas já foram
                  pagas,{" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={settlePast}
                    disabled={busy === "past"}
                  >
                    dar baixa em todas de uma vez
                  </button>
                  .
                </span>
              </div>
            )}

            <div className="list">
              {bills.map((bill) => (
                <div key={bill.month} className="list-row" style={{ alignItems: "flex-start" }}>
                  <div className="row-main">
                    <div className="category-bar-top">
                      <span className="row-title">
                        {formatMonthLabel(`${bill.month}-01`)}
                        <span
                          className={STATUS_BADGE[bill.status].className}
                          style={{ marginLeft: 6 }}
                        >
                          {STATUS_BADGE[bill.status].label}
                        </span>
                      </span>
                      <span className="nowrap tabular">
                        <strong>{formatMoney(bill.total)}</strong>
                      </span>
                    </div>
                    <div className="row-meta">{billMeta(bill)}</div>
                  </div>
                  <div className="row-actions" style={{ display: "flex" }}>
                    {bill.payment ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => undo(bill)}
                        disabled={busy === bill.month}
                      >
                        Desfazer
                      </button>
                    ) : bill.status === "futura" || bill.total === 0 ? null : (
                      <button className="btn btn-secondary btn-sm" onClick={() => setPaying(bill)}>
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <FormError message={actionError} />
          </>
        )}
      </Modal>

      {paying && (
        <PayBillModal
          card={card}
          bill={paying}
          accounts={accounts}
          onClose={() => setPaying(null)}
          onDone={reload}
        />
      )}
    </>
  );
}

function billMeta(bill: Bill) {
  const parts: string[] = [];
  if (bill.dueDate) parts.push(`vence ${formatDate(bill.dueDate)}`);
  if (bill.items > 0) parts.push(`${bill.items} ${bill.items === 1 ? "lançamento" : "lançamentos"}`);
  if (bill.payment) {
    parts.push(
      `${KIND_LABEL[bill.payment.kind]} em ${formatDate(bill.payment.date)}`,
    );
  }
  if (bill.remaining > 0 && bill.credits > 0) {
    parts.push(`falta ${formatMoney(bill.remaining)}`);
  }
  if (bill.payment && bill.remaining > 0) {
    parts.push(`${formatMoney(bill.remaining)} entrou depois do pagamento`);
  }
  return parts.join(" · ");
}

/** Baixa de uma fatura: com pagamento saindo da conta, ou só o registro. */
export function PayBillModal({
  card,
  bill,
  accounts,
  onClose,
  onDone,
}: {
  card: Card;
  bill: Bill;
  accounts: Account[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [kind, setKind] = useState<BillPaymentKind>(
    accounts.length > 0 ? "transferencia" : "externo",
  );
  const [cents, setCents] = useState(numberToCents(bill.remaining));
  const [accountId, setAccountId] = useState(
    String(card.paymentAccountId ?? accounts[0]?.id ?? ""),
  );
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/cards/${card.id}/bills/${bill.month}/pay`, {
        kind,
        amount: cents / 100,
        date,
        ...(kind === "transferencia" ? { from_account_id: Number(accountId) } : {}),
      });
      toast(`Fatura de ${formatMonthLabel(`${bill.month}-01`)} marcada como paga`);
      notifyDataChanged();
      onDone();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Pagar fatura de ${formatMonthLabel(`${bill.month}-01`)}`}
      description={`${card.name} · total da fatura ${formatMoney(bill.total)}`}
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : "Dar baixa"}
        </button>
      }
    >
      <div className="form-stack">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "transferencia", label: "Pagar da conta" },
            { value: "externo", label: "Paguei fora" },
            { value: "lancado", label: "Já lancei" },
          ]}
        />
        {kind === "transferencia" && (
          <Field
            label="Conta que paga"
            htmlFor="pay-account"
            hint="Vai entrar como uma transferência: sai da conta e abate a dívida do cartão."
          >
            <select
              id="pay-account"
              className="select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {kind === "lancado" && (
          <div className="alert alert-info">
            <IconAlert size={16} />
            <span>
              Use quando o pagamento já está nos lançamentos. A fatura passa a aparecer como paga e
              nada é criado nem descontado de novo.
            </span>
          </div>
        )}
        <Field
          label="Valor pago"
          htmlFor="pay-amount"
          hint={
            bill.credits > 0
              ? `Já lançado para essa fatura: ${formatMoney(bill.credits)}. Falta ${formatMoney(bill.remaining)}.`
              : "Por padrão, o total da fatura."
          }
        >
          <MoneyInput id="pay-amount" cents={cents} onChange={setCents} large />
        </Field>
        <Field label="Data do pagamento" htmlFor="pay-date">
          <input
            id="pay-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
