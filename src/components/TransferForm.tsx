import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Account, Card } from "../types";
import { getCurrentMonth, todayISO } from "../utils/date";
import { pickDefault } from "../utils/preferences";
import { Modal } from "./Modal";
import { Field, FormError, MoneyInput } from "./ui/Form";
import { IconInfo } from "./ui/Icons";

/**
 * Transferência entre contas ou pagamento de fatura (conta -> cartão).
 * Não entra nos totais de receita e despesa: o dinheiro só muda de lugar.
 */
export function TransferFormModal({ onClose }: { onClose: () => void }) {
  const { month, notifyDataChanged } = useApp();
  const toast = useToast();
  const { data: accounts = [] } = useFetch<Account[]>("/accounts");
  const { data: cards = [] } = useFetch<Card[]>("/cards");

  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeCards = cards.filter((c) => !c.archived);

  const [cents, setCents] = useState(0);
  const [from, setFrom] = useState<number | "">("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(month === getCurrentMonth() ? todayISO() : `${month}-01`);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagando fatura, a origem já vem como a conta configurada no cartão.
  const destinationCard =
    to.startsWith("card:") ? activeCards.find((c) => c.id === Number(to.split(":")[1])) : undefined;
  const suggestedFrom =
    (destinationCard?.paymentAccountId &&
      activeAccounts.find((a) => a.id === destinationCard.paymentAccountId)?.id) ||
    pickDefault(activeAccounts, "account");
  const effectiveFrom = from === "" ? suggestedFrom : from;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cents <= 0) return setError("Informe um valor maior que zero.");
    if (!effectiveFrom) return setError("Cadastre uma conta de origem primeiro.");
    if (!to) return setError("Escolha o destino.");

    const [kind, id] = to.split(":");
    setSaving(true);
    try {
      await api.post("/transfers", {
        from_account_id: effectiveFrom,
        ...(kind === "card" ? { to_card_id: Number(id) } : { to_account_id: Number(id) }),
        amount: cents / 100,
        date,
        description: description.trim() || undefined,
      });
      toast(kind === "card" ? "Pagamento de fatura registrado" : "Transferência registrada");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Não consegui registrar a transferência."));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Transferência"
      description="Entre suas contas ou para pagar a fatura do cartão"
      onClose={onClose}
      size="sm"
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : "Registrar"}
        </button>
      }
    >
      <div className="form-stack">
        <Field label="Valor" htmlFor="tr-amount">
          <MoneyInput id="tr-amount" cents={cents} onChange={setCents} large autoFocus />
        </Field>

        <Field label="De" htmlFor="tr-from">
          <select
            id="tr-from"
            className="select"
            value={effectiveFrom}
            onChange={(e) => setFrom(e.target.value ? Number(e.target.value) : "")}
          >
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Para" htmlFor="tr-to">
          <select id="tr-to" className="select" value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Escolha o destino...</option>
            {activeAccounts
              .filter((account) => account.id !== effectiveFrom)
              .map((account) => (
                <option key={`account:${account.id}`} value={`account:${account.id}`}>
                  {account.name}
                </option>
              ))}
            {activeCards.map((card) => (
              <option key={`card:${card.id}`} value={`card:${card.id}`}>
                Fatura · {card.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data" htmlFor="tr-date">
          <input
            id="tr-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="Descrição" htmlFor="tr-description" hint="Opcional">
          <input
            id="tr-description"
            className="input"
            value={description}
            maxLength={200}
            placeholder="Ex.: reserva de emergência"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="alert alert-info">
          <IconInfo size={16} />
          <span>
            Transferência muda o saldo das contas, mas não conta como receita nem despesa do mês.
          </span>
        </div>

        <FormError message={error} />
      </div>
    </Modal>
  );
}
