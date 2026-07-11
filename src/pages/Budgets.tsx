import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Category } from "../types";
import { formatMonthLabel, shiftMonth } from "../utils/date";

interface BudgetItem {
  id: number;
  categoryId: number;
  categoryName: string;
  color: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
}

function IconTrash() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export function Budgets() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [limitAmount, setLimitAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        api.get<BudgetItem[]>(`/budgets?month=${month}`),
        api.get<Category[]>("/categories"),
      ]);
      setBudgets(budgetsRes.data);
      setCategories(categoriesRes.data.filter((c) => c.type === "despesa"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!categoryId || !limitAmount) {
      setFeedback({
        type: "error",
        message: "Selecione uma categoria e informe o limite.",
      });
      return;
    }

    setSaving(true);
    try {
      await api.post("/budgets", {
        category_id: categoryId,
        month_ref: `${month}-01`,
        limit_amount: parseFloat(limitAmount.replace(",", ".")),
      });
      setFeedback({ type: "success", message: "Meta definida com sucesso!" });
      setLimitAmount("");
      await loadData();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "Erro ao salvar meta." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/budgets/${id}`);
    await loadData();
  }

  const formatMoney = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // categorias que ainda não têm meta definida nesse mês
  const categoriesWithoutBudget = categories.filter(
    (c) => !budgets.some((b) => b.categoryId === c.id),
  );

  return (
    <div style={{ maxWidth: 1000 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            style={navButtonStyle}
          >
            ‹
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#1A1A1A",
              textTransform: "capitalize",
            }}
          >
            {formatMonthLabel(month)}
          </h2>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            style={navButtonStyle}
          >
            ›
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          style={{ ...cardStyle, position: "sticky", top: 20 }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              color: "#1A1A1A",
              marginBottom: 16,
            }}
          >
            Definir Meta
          </h3>

          <Field label="Categoria" style={{ marginBottom: 12 }}>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              style={inputStyle}
            >
              <option value="">Selecione...</option>
              {categoriesWithoutBudget.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {categoriesWithoutBudget.length === 0 && (
                <option value="" disabled>
                  Todas as categorias já têm meta
                </option>
              )}
            </select>
          </Field>

          <Field label="Limite mensal (R$)" style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="0,00"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
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
                background: feedback.type === "success" ? "#DCFCE7" : "#FEE2E2",
                color: feedback.type === "success" ? "#166534" : "#991B1B",
              }}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
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
            {saving ? "Salvando..." : "Definir Meta"}
          </button>
        </form>

        {/* Lista de metas */}
        <div style={cardStyle}>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              color: "#1A1A1A",
              marginBottom: 16,
            }}
          >
            Metas do mês ({budgets.length})
          </h3>

          {loading ? (
            <p style={{ color: "#999", fontSize: 13 }}>Carregando...</p>
          ) : budgets.length === 0 ? (
            <p style={{ color: "#999", fontSize: 13 }}>
              Nenhuma meta definida neste mês.
            </p>
          ) : (
            budgets.map((b) => {
              const overBudget = b.percentageUsed > 100;
              const barColor = overBudget
                ? "#DC2626"
                : b.percentageUsed > 80
                  ? "#F59E0B"
                  : "#16A34A";

              return (
                <div
                  key={b.id}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid #F3F3F3",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: b.color,
                          display: "inline-block",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14,
                          color: "#1A1A1A",
                          fontWeight: 600,
                        }}
                      >
                        {b.categoryName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(b.id)}
                      style={iconButtonStyle}
                      title="Excluir meta"
                    >
                      <IconTrash />
                    </button>
                  </div>

                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: "#F0F0F0",
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(b.percentageUsed, 100)}%`,
                        background: barColor,
                        borderRadius: 4,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    <span>
                      {formatMoney(b.spent)} de {formatMoney(b.limitAmount)}
                    </span>
                    <span style={{ color: barColor, fontWeight: 700 }}>
                      {b.percentageUsed}% {overBudget && "(estourou!)"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
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

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  border: "1px solid #EEE",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #DDD",
  fontSize: 13,
  color: "#1A1A1A",
  outline: "none",
};

const navButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #DDD",
  background: "#fff",
  cursor: "pointer",
  fontSize: 16,
  color: "#555",
};

const iconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#888",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  padding: 4,
};
