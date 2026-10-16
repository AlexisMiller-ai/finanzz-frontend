import { useState } from "react";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { DashboardSummary } from "../types";
import { daysInMonth, formatMonthLabel, getCurrentMonth, remainingDaysInMonth } from "../utils/date";
import { formatMoney, formatPercent, numberToCents } from "../utils/money";
import { Modal } from "./Modal";
import { Field, FormError, MoneyInput } from "./ui/Form";
import { ProgressBar, Skeleton } from "./ui/Common";
import { IconPiggy } from "./ui/Icons";

/**
 * O plano do mês: quanto entra, quanto você quer guardar e quanto sobra para
 * gastar. É o orçamento principal — os limites por categoria são um detalhe
 * opcional em cima disso.
 */
export function MonthPlan() {
  const { month } = useApp();
  const summary = useFetch<DashboardSummary>(`/dashboard/summary?month=${month}`);
  const [editing, setEditing] = useState(false);

  const s = summary.data;
  if (!s) {
    return (
      <div className="card">
        <Skeleton width={160} height={14} />
        <Skeleton height={90} style={{ marginTop: 16 }} />
      </div>
    );
  }

  const renda = s.entradasPeriodo;
  const meta = s.savingsGoal;
  const limite = Math.max(renda - meta, 0);
  const gasto = s.saidasPeriodo;
  const restante = limite - gasto;
  const usado = limite > 0 ? (gasto / limite) * 100 : 0;

  const isCurrentMonth = month === getCurrentMonth();
  const dias = remainingDaysInMonth(month);
  const porDia = dias > 0 && restante > 0 ? restante / dias : 0;

  // No ritmo de gasto até aqui, quanto o mês deve fechar?
  const diasNoMes = daysInMonth(month);
  const diasCorridos = isCurrentMonth ? Math.max(diasNoMes - dias + 1, 1) : diasNoMes;
  const projecao = isCurrentMonth ? (gasto / diasCorridos) * diasNoMes : gasto;
  const vaiEstourar = limite > 0 && isCurrentMonth && projecao > limite && gasto <= limite;

  const tone = restante < 0 ? "bad" : usado >= 80 ? "warning" : "good";

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Plano de {formatMonthLabel(month).toLowerCase()}</h2>
            <p className="card-subtitle">
              {meta > 0
                ? "Quanto entrou, quanto você guarda e quanto ainda dá para gastar"
                : "Defina quanto quer guardar para saber quanto pode gastar"}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            <IconPiggy size={14} /> {meta > 0 ? "Mudar meta" : "Definir meta"}
          </button>
        </div>

        <div className="plan-grid">
          <div>
            <div className="plan-item-label">Entrou no mês</div>
            <div className="plan-item-value">{formatMoney(renda)}</div>
            <div className="field-hint">receitas lançadas neste mês</div>
          </div>
          <div>
            <div className="plan-item-label">Quero guardar</div>
            <div className="plan-item-value">{meta > 0 ? formatMoney(meta) : "—"}</div>
            <div className="field-hint">
              {meta > 0 ? "vale todo mês até você mudar" : "nenhuma meta definida"}
            </div>
          </div>
          <div>
            <div className="plan-item-label">
              {restante < 0 ? "Passou do planejado" : "Ainda posso gastar"}
            </div>
            <div className={`plan-item-value ${restante < 0 ? "text-out" : "text-in"}`}>
              {formatMoney(Math.abs(restante))}
            </div>
            <div className="field-hint">
              {meta > 0
                ? `entrou − meta − ${formatMoney(gasto)} já gastos`
                : `entrou − ${formatMoney(gasto)} já gastos`}
            </div>
          </div>
        </div>

        {limite > 0 ? (
          <div style={{ marginTop: 18 }}>
            <ProgressBar percent={usado} tone={tone} />
            <div className="row-meta" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <span>
                <strong>{formatMoney(gasto)}</strong> gastos de {formatMoney(limite)} planejados (
                {formatPercent(usado)})
              </span>
              {isCurrentMonth && porDia > 0 && (
                <span>
                  {formatMoney(porDia)} por dia {dias === 1 ? "hoje" : `nos ${dias} dias restantes`}
                </span>
              )}
            </div>

            {vaiEstourar && (
              <div className="alert alert-warning" style={{ marginTop: 12 }}>
                <span>
                  No ritmo atual o mês fecha em {formatMoney(projecao)} — {formatMoney(projecao - limite)}{" "}
                  acima do que você planejou gastar.
                </span>
              </div>
            )}
            {restante < 0 && (
              <div className="alert alert-error" style={{ marginTop: 12 }}>
                <span>
                  Você já passou do limite. Para manter a meta de {formatMoney(meta)}, o mês precisaria
                  fechar em {formatMoney(limite)}.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <span>
              {renda === 0
                ? "Lance as entradas do mês para o plano aparecer."
                : "Defina quanto quer guardar e o limite de gasto aparece aqui."}
            </span>
          </div>
        )}
      </div>

      {editing && <GoalModal month={month} current={meta} onClose={() => setEditing(false)} />}
    </>
  );
}

function GoalModal({
  month,
  current,
  onClose,
}: {
  month: string;
  current: number;
  onClose: () => void;
}) {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const [cents, setCents] = useState(numberToCents(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: number) {
    setSaving(true);
    setError(null);
    try {
      await api.post("/goals", { month_ref: `${month}-01`, savings_goal: value / 100 });
      toast(value > 0 ? "Meta salva" : "Meta encerrada");
      notifyDataChanged();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Quanto você quer guardar por mês"
      description={`Vale a partir de ${formatMonthLabel(month).toLowerCase()} e continua nos meses seguintes, até você mudar.`}
      onClose={onClose}
      size="sm"
      onSubmit={(e) => {
        e.preventDefault();
        save(cents);
      }}
      footer={
        <>
          {current > 0 && (
            <button type="button" className="btn btn-danger-ghost" disabled={saving} onClick={() => save(0)}>
              Encerrar meta
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : "Salvar"}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="Valor por mês" htmlFor="plan-goal">
          <MoneyInput id="plan-goal" cents={cents} onChange={setCents} large autoFocus />
        </Field>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
