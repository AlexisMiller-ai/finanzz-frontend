import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { UpcomingItem, UpcomingResponse } from "../types";
import { formatDate } from "../utils/date";
import { formatMoney } from "../utils/money";
import { FormError } from "./ui/Form";
import { IconAlert, IconCheck } from "./ui/Icons";

const DIAS = 7;

/** "venceu há 2 dias", "vence hoje", "vence amanhã", "em 5 dias". */
function prazo(emDias: number) {
  if (emDias < -1) return `venceu há ${Math.abs(emDias)} dias`;
  if (emDias === -1) return "venceu ontem";
  if (emDias === 0) return "vence hoje";
  if (emDias === 1) return "vence amanhã";
  return `em ${emDias} dias`;
}

/**
 * Contas a pagar e a receber: o que está pendente e já venceu, e o que vence
 * nos próximos dias. Some da tela quando não há nada em aberto.
 */
export function UpcomingCard() {
  const { notifyDataChanged } = useApp();
  const toast = useToast();
  const { data, reload } = useFetch<UpcomingResponse>(`/transactions/upcoming?days=${DIAS}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data || (data.vencidos.length === 0 && data.proximos.length === 0)) return null;

  async function darBaixa(item: UpcomingItem) {
    setBusy(String(item.id));
    setError(null);
    try {
      await api.put(`/transactions/${item.id}/settle`, { settled: true });
      toast(item.movimento === "receita" ? "Marcado como recebido" : "Marcado como pago");
      notifyDataChanged();
      reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const { totais } = data;
  const aPagar = totais.aPagarVencido + totais.aPagarProximos;
  const aReceber = totais.aReceberVencido + totais.aReceberProximos;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">A pagar e a receber</h2>
          <p className="card-subtitle">
            {data.vencidos.length > 0 && (
              <span className="text-out">
                {data.vencidos.length} vencido{data.vencidos.length > 1 ? "s" : ""} ·{" "}
              </span>
            )}
            Próximos {DIAS} dias
            {data.aindaMaisTarde > 0 && ` · mais ${data.aindaMaisTarde} depois disso`}
          </p>
        </div>
        <div className="nowrap tabular" style={{ textAlign: "right" }}>
          {aPagar > 0 && <div className="row-title">{formatMoney(aPagar)} a pagar</div>}
          {aReceber > 0 && (
            <div className="row-meta text-in">{formatMoney(aReceber)} a receber</div>
          )}
        </div>
      </div>

      <div className="list">
        {[...data.vencidos, ...data.proximos].map((item) => (
          <div key={`${item.tipo}-${item.id}`} className="list-row">
            <div className="row-main">
              <div className="row-title">
                {item.descricao}
                {item.emDias < 0 && (
                  <span className="badge badge-out" style={{ marginLeft: 6 }}>
                    atrasado
                  </span>
                )}
              </div>
              <div className="row-meta">
                {prazo(item.emDias)} · {formatDate(item.vencimento)}
                {item.origem && ` · ${item.origem}`}
              </div>
            </div>
            <div className={`row-amount ${item.movimento === "receita" ? "text-in" : ""}`}>
              {formatMoney(item.valor)}
            </div>
            <div className="row-actions" style={{ display: "flex" }}>
              {item.tipo === "lancamento" ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => darBaixa(item)}
                  disabled={busy === String(item.id)}
                >
                  <IconCheck size={14} /> {item.movimento === "receita" ? "Recebi" : "Paguei"}
                </button>
              ) : (
                <Link className="btn btn-secondary btn-sm" to="/contas">
                  Ver fatura
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ paddingTop: 10 }}>
          <FormError message={error} />
        </div>
      )}
      {data.vencidos.length > 0 && (
        <p className="row-meta" style={{ marginTop: 10 }}>
          <IconAlert size={14} /> O que está pendente fica fora do saldo das contas até receber
          baixa.
        </p>
      )}
    </div>
  );
}
