import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Category, Transaction } from "../types";
import { formatMonthLabel, shiftMonth, getCurrentMonth } from "../utils/date";
import { Modal } from "../components/Modal";
import { TransactionForm } from "../components/TransactionForm";

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

function IconEdit() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function Transactions() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  async function loadData() {
    setLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        api.get<Transaction[]>(`/transactions?month=${month}`),
        api.get<Category[]>("/categories"),
      ]);
      setTransactions(transactionsRes.data);
      setCategories(categoriesRes.data);
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

  function openNewModal() {
    setEditingTransaction(null);
    setShowModal(true);
  }

  function openEditModal(t: Transaction) {
    setEditingTransaction(t);
    setShowModal(true);
  }

  async function handleDelete(t: Transaction) {
    if (t.installment_group_id) {
      const confirmAll = window.confirm(
        `Esta é a parcela ${t.installment_number}/${t.installment_total}. Deseja excluir TODAS as parcelas dessa compra, ou só esta?\n\nOK = excluir todas\nCancelar = excluir só esta parcela`,
      );
      if (confirmAll) {
        await api.delete(`/transactions/group/${t.installment_group_id}`);
      } else {
        await api.delete(`/transactions/${t.id}`);
      }
    } else {
      await api.delete(`/transactions/${t.id}`);
    }
    await loadData();
  }

  const formatMoney = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div style={{ maxWidth: 800 }}>
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

        <button
          onClick={openNewModal}
          style={{
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          + Lançamento
        </button>
      </div>

      <div style={cardStyle}>
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            color: "#1A1A1A",
            marginBottom: 16,
          }}
        >
          Histórico do mês ({transactions.length})
        </h3>

        <div style={{ maxHeight: 520, overflowY: "auto" }}>
          {loading ? (
            <p style={{ color: "#999", fontSize: 13 }}>Carregando...</p>
          ) : transactions.length === 0 ? (
            <p style={{ color: "#999", fontSize: 13 }}>
              Nenhum lançamento neste mês.
            </p>
          ) : (
            transactions.map((t) => {
              const category = t.category_id
                ? categoryMap.get(t.category_id)
                : null;
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #F3F3F3",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: category?.color || "#CCC",
                        display: "inline-block",
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, color: "#1A1A1A" }}>
                        {t.description || category?.name || "Sem descrição"}
                      </div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {category?.name || "Sem categoria"}
                        {t.installment_total && t.installment_total > 1 && (
                          <>
                            {" "}
                            · Parcela {t.installment_number}/
                            {t.installment_total}
                          </>
                        )}
                        {t.payment_method === "credito" && t.purchase_date ? (
                          <>
                            {" · Comprado em "}
                            {new Date(t.purchase_date).toLocaleDateString(
                              "pt-BR",
                              { timeZone: "UTC" },
                            )}
                            {" · Fatura de "}
                            {new Date(t.date).toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                              month: "long",
                              year: "numeric",
                            })}
                          </>
                        ) : (
                          <>
                            {" "}
                            ·{" "}
                            {new Date(t.date).toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <strong
                      style={{
                        fontSize: 13,
                        color: t.type === "receita" ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {t.type === "receita" ? "+ " : "- "}
                      {formatMoney(Number(t.amount))}
                    </strong>
                    <button
                      onClick={() => openEditModal(t)}
                      style={iconButtonStyle}
                      title="Editar"
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      style={{ ...iconButtonStyle, color: "#DC2626" }}
                      title="Excluir"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <TransactionForm
            editingTransaction={editingTransaction}
            onSaved={() => {
              setShowModal(false);
              loadData();
            }}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
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
