import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Category, Transaction } from "../types";

interface Props {
  editingTransaction?: Transaction | null;
  onSaved: () => void;
  onCancel?: () => void;
}

export function TransactionForm({
  editingTransaction,
  onSaved,
  onCancel,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"despesa" | "receita">(
    editingTransaction?.type || "despesa",
  );
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount) : "",
  );
  const [categoryId, setCategoryId] = useState<number | "">(
    editingTransaction?.category_id || "",
  );
  const [description, setDescription] = useState(
    editingTransaction?.description || "",
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<
    "dinheiro" | "debito" | "credito"
  >(editingTransaction?.payment_method || "dinheiro");
  const [purchaseDate, setPurchaseDate] = useState(
    editingTransaction?.purchase_date?.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
  );
  const [billingMonth, setBillingMonth] = useState(
    editingTransaction?.date.slice(0, 7) ||
      new Date().toISOString().slice(0, 7),
  );

  const filteredCategories = categories.filter((c) => c.type === type);
  const isCredit = paymentMethod === "credito";

  useEffect(() => {
    api.get<Category[]>("/categories").then((res) => {
      setCategories(res.data);
      if (!editingTransaction && res.data.length > 0) {
        setCategoryId(res.data.find((c) => c.type === type)?.id || "");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editingTransaction) {
      setCategoryId(categories.find((c) => c.type === type)?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // quando muda a data da compra e não é crédito, sincroniza o mês de referência automaticamente
  useEffect(() => {
    if (!isCredit) {
      setBillingMonth(purchaseDate.slice(0, 7));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseDate, paymentMethod]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!amount || !purchaseDate) {
      setFeedback({ type: "error", message: "Preencha valor e data." });
      return;
    }

    setSaving(true);
    try {
      const referenceDate = isCredit ? `${billingMonth}-01` : purchaseDate;

      const payload = {
        amount: parseFloat(amount.replace(",", ".")),
        type,
        category_id: categoryId || null,
        description: description || null,
        date: referenceDate,
        purchase_date: purchaseDate,
        payment_method: paymentMethod,
      };

      if (editingTransaction) {
        await api.put(`/transactions/${editingTransaction.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }

      onSaved();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Erro ao salvar lançamento." });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3
        style={{ margin: 0, fontSize: 16, color: "#1A1A1A", marginBottom: 16 }}
      >
        {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
      </h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setType("despesa")}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            background: type === "despesa" ? "#DC2626" : "#F3F3F3",
            color: type === "despesa" ? "#fff" : "#888",
          }}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => setType("receita")}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            background: type === "receita" ? "#16A34A" : "#F3F3F3",
            color: type === "receita" ? "#fff" : "#888",
          }}
        >
          Receita
        </button>
      </div>

      {type === "despesa" && (
        <Field label="Forma de pagamento" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["dinheiro", "debito", "credito"] as const).map((pm) => (
              <button
                key={pm}
                type="button"
                onClick={() => setPaymentMethod(pm)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "1px solid #DDD",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: paymentMethod === pm ? "#7C3AED" : "#fff",
                  color: paymentMethod === pm ? "#fff" : "#555",
                  borderColor: paymentMethod === pm ? "#7C3AED" : "#DDD",
                }}
              >
                {pm === "dinheiro"
                  ? "Dinheiro"
                  : pm === "debito"
                    ? "Débito"
                    : "Crédito"}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Valor (R$)" style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={inputStyle}
          autoFocus
        />
      </Field>

      <Field
        label={isCredit ? "Data da compra" : "Data"}
        style={{ marginBottom: 12 }}
      >
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          style={inputStyle}
        />
      </Field>

      {isCredit && (
        <Field
          label="Fatura de qual mês (quando vai pagar)"
          style={{ marginBottom: 12 }}
        >
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            style={inputStyle}
          />
        </Field>
      )}

      <Field label="Categoria" style={{ marginBottom: 12 }}>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          style={inputStyle}
        >
          {filteredCategories.length === 0 && (
            <option value="">Nenhuma categoria</option>
          )}
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Descrição" style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Ex: Mercado mensal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={inputStyle}
        />
      </Field>

      {feedback && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            background: "#FEE2E2",
            color: "#991B1B",
          }}
        >
          {feedback.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            flex: 1,
            padding: "12px 0",
            borderRadius: 8,
            border: "none",
            background: "#7C3AED",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? "Salvando..."
            : editingTransaction
              ? "Salvar Alterações"
              : "Confirmar Lançamento"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #DDD",
              background: "#fff",
              color: "#555",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label
        style={{
          fontSize: 12,
          color: "#555",
          fontWeight: 600,
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #DDD",
  fontSize: 13,
  color: "#1A1A1A",
  outline: "none",
};
