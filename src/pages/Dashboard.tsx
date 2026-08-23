import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../services/api";
import type {
  DashboardSummary,
  DistributionItem,
  Transaction,
  Category,
} from "../types";
import {
  formatMonthLabel,
  formatMonthShort,
  shiftMonth,
  getLastNMonths,
  getCurrentMonth,
} from "../utils/date";
import { Modal } from "../components/Modal";
import { TransactionForm } from "../components/TransactionForm";

function IconTrend() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 7l6 6 4-4 8 8" />
      <path d="M14 17h7v-7" />
    </svg>
  );
}

function IconPiggy() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 9a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1h-1v1a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2a5 5 0 0 1 5-5h6a4 4 0 0 1 3 1.5" />
      <circle cx="8" cy="13" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg
      width="13"
      height="13"
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

export function Dashboard() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCurrentMonth);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [evolution, setEvolution] = useState<
    { month: string; entradas: number; saidas: number }[]
  >([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    [],
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [savingsInput, setSavingsInput] = useState("");
  const [savingSavings, setSavingSavings] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [summaryRes, distributionRes, transactionsRes, categoriesRes] =
        await Promise.all([
          api.get<DashboardSummary>(`/dashboard/summary?month=${month}`),
          api.get<DistributionItem[]>(`/dashboard/distribution?month=${month}`),
          api.get<Transaction[]>(`/transactions?month=${month}`),
          api.get<Category[]>("/categories"),
        ]);

      setSummary(summaryRes.data);
      setDistribution(distributionRes.data);
      setRecentTransactions(transactionsRes.data.slice(0, 5));
      setCategories(categoriesRes.data);

      const months = getLastNMonths(month, 6);
      const evolutionData = await Promise.all(
        months.map(async (m) => {
          const res = await api.get<DashboardSummary>(
            `/dashboard/summary?month=${m}`,
          );
          return {
            month: formatMonthShort(m),
            entradas: res.data.entradasPeriodo,
            saidas: res.data.saidasPeriodo,
          };
        }),
      );
      setEvolution(evolutionData);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const formatMoney = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalInput) return;
    setSavingGoal(true);
    try {
      await api.post("/goals", {
        month_ref: `${month}-01`,
        savings_goal: parseFloat(goalInput.replace(",", ".")),
      });
      setShowGoalModal(false);
      setGoalInput("");
      loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleSaveSavings(e: React.FormEvent) {
    e.preventDefault();
    if (!savingsInput) return;
    setSavingSavings(true);
    try {
      await api.put("/savings", {
        manual_total: parseFloat(savingsInput.replace(",", ".")),
      });
      setShowSavingsModal(false);
      setSavingsInput("");
      loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingSavings(false);
    }
  }

  if (loading && !summary) return <div>Carregando...</div>;
  if (!summary) return <div>Erro ao carregar dados.</div>;

  return (
    <div style={{ maxWidth: 1200 }}>
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
          onClick={() => setShowModal(true)}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <KpiCard
          title="SALDO DO MÊS"
          value={summary.saldoPeriodo}
          icon={<IconTrend />}
          topColor="#1A1A1A"
        />
        <KpiCard
          title="ENTRADAS"
          value={summary.entradasPeriodo}
          icon={<IconCard />}
          topColor="#16A34A"
          valueColor="#16A34A"
        />
        <KpiCard
          title="SAÍDAS"
          value={summary.saidasPeriodo}
          icon={<IconDown />}
          topColor="#DC2626"
          valueColor="#DC2626"
        />
        <KpiCard
          title="ECONOMIA"
          value={summary.taxaEconomia}
          icon={<IconPiggy />}
          topColor="#16A34A"
          isPercentage
          subtitle={`${summary.taxaEconomia}% da renda guardada`}
        />
      </div>

      {/* Total guardado, versão discreta, com botão de editar */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "#888",
          padding: "4px 4px",
        }}
      >
        <span style={{ display: "flex", color: "#AAA" }}>
          <IconPiggy />
        </span>
        <span>Total guardado desde Agosto/2026:</span>
        <strong
          style={{
            color: summary.saldoGeralAcumulado < 0 ? "#DC2626" : "#555",
            fontWeight: 700,
          }}
        >
          {formatMoney(summary.saldoGeralAcumulado)}
        </strong>
        <button
          onClick={() => {
            setSavingsInput(String(summary.saldoGeralAcumulado));
            setShowSavingsModal(true);
          }}
          title="Editar valor guardado"
          style={{
            border: "none",
            background: "transparent",
            color: "#AAA",
            cursor: "pointer",
            display: "flex",
            padding: 2,
          }}
        >
          <IconEdit />
        </button>
      </div>

      {/* Card de meta de economia / disponível para gastar */}
      <div
        style={{
          marginTop: 16,
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          border: "1px solid #EEE",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#F3EEFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7C3AED",
            }}
          >
            <IconTarget />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              META DE ECONOMIA DO MÊS
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
              {summary.savingsGoal > 0
                ? formatMoney(summary.savingsGoal)
                : "Nenhuma meta definida"}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 12,
              color: "#999",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            DISPONÍVEL PARA GASTAR
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: summary.availableToSpend < 0 ? "#DC2626" : "#16A34A",
            }}
          >
            {formatMoney(summary.availableToSpend)}
          </div>
        </div>

        <button
          onClick={() => {
            setGoalInput(
              summary.savingsGoal > 0 ? String(summary.savingsGoal) : "",
            );
            setShowGoalModal(true);
          }}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #DDD",
            background: "#fff",
            color: "#555",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {summary.savingsGoal > 0 ? "Editar meta" : "Definir meta"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#1A1A1A" }}>
            Evolução
          </h3>
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#999" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#999" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={false}
                  name="Entradas"
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={false}
                  name="Saídas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#1A1A1A" }}>
            Gastos por categoria
          </h3>
          <div style={{ marginTop: 16 }}>
            {distribution.length === 0 ? (
              <p style={{ color: "#999", fontSize: 13 }}>
                Sem saídas neste mês.
              </p>
            ) : (
              distribution.map((item) => (
                <div
                  key={item.categoryId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #F3F3F3",
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
                        background: item.color,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ fontSize: 13, color: "#333" }}>
                      {item.name}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13, color: "#1A1A1A" }}>
                    {formatMoney(item.total)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, color: "#1A1A1A" }}>
            Últimas transações
          </h3>
          <span
            onClick={() => navigate("/transacoes")}
            style={{
              fontSize: 13,
              color: "#7C3AED",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Ver todas →
          </span>
        </div>

        <div style={{ marginTop: 16 }}>
          {recentTransactions.length === 0 ? (
            <p style={{ color: "#999", fontSize: 13 }}>
              Nenhuma transação neste mês.
            </p>
          ) : (
            recentTransactions.map((t) => {
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
                    padding: "10px 0",
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
                        {t.payment_method === "credito" && t.purchase_date
                          ? `Comprado em ${new Date(t.purchase_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                          : new Date(t.date).toLocaleDateString("pt-BR", {
                              timeZone: "UTC",
                            })}
                      </div>
                    </div>
                  </div>
                  <strong
                    style={{
                      fontSize: 13,
                      color: t.type === "receita" ? "#16A34A" : "#DC2626",
                    }}
                  >
                    {t.type === "receita" ? "+ " : "- "}
                    {formatMoney(Number(t.amount))}
                  </strong>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <TransactionForm
            onSaved={() => {
              setShowModal(false);
              loadData();
            }}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}

      {showGoalModal && (
        <Modal onClose={() => setShowGoalModal(false)}>
          <form onSubmit={handleSaveGoal}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: "#1A1A1A",
                marginBottom: 16,
              }}
            >
              Meta de economia — {formatMonthLabel(month)}
            </h3>
            <label
              style={{
                fontSize: 12,
                color: "#555",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              Quanto você quer guardar este mês (R$)
            </label>
            <input
              type="text"
              placeholder="0,00"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #DDD",
                fontSize: 14,
                color: "#1A1A1A",
                outline: "none",
                marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={savingGoal}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: "none",
                  background: "#7C3AED",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: savingGoal ? "not-allowed" : "pointer",
                  opacity: savingGoal ? 0.7 : 1,
                }}
              >
                {savingGoal ? "Salvando..." : "Salvar meta"}
              </button>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
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
            </div>
          </form>
        </Modal>
      )}

      {showSavingsModal && (
        <Modal onClose={() => setShowSavingsModal(false)}>
          <form onSubmit={handleSaveSavings}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: "#1A1A1A",
                marginBottom: 8,
              }}
            >
              Editar total guardado
            </h3>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
              Ajuste o valor que você realmente tem guardado. A partir de agora,
              o total continua sendo atualizado automaticamente conforme você
              lançar novas transações.
            </p>
            <label
              style={{
                fontSize: 12,
                color: "#555",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
              }}
            >
              Valor total guardado (R$)
            </label>
            <input
              type="text"
              placeholder="0,00"
              value={savingsInput}
              onChange={(e) => setSavingsInput(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #DDD",
                fontSize: 14,
                color: "#1A1A1A",
                outline: "none",
                marginBottom: 16,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                disabled={savingSavings}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: "none",
                  background: "#7C3AED",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: savingSavings ? "not-allowed" : "pointer",
                  opacity: savingSavings ? 0.7 : 1,
                }}
              >
                {savingSavings ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setShowSavingsModal(false)}
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
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  topColor,
  valueColor,
  isPercentage,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  topColor: string;
  valueColor?: string;
  isPercentage?: boolean;
  subtitle?: string;
}) {
  const isNegative = value < 0;
  const displayValue = isPercentage
    ? `${value}%`
    : Math.abs(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "18px 20px",
        borderTop: `3px solid ${topColor}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#999",
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          {title}
        </span>
        <span style={{ color: "#999", display: "flex" }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          marginTop: 10,
          color:
            valueColor || (isNegative && !isPercentage ? "#DC2626" : "#1A1A1A"),
        }}
      >
        {isNegative && !isPercentage ? "- " : ""}
        {displayValue}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          {subtitle}
        </div>
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
