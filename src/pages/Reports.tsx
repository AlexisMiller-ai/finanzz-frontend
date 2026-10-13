import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFetch } from "../hooks/useFetch";
import { useThemeColors } from "../hooks/useThemeColors";
import type { Report, ReportCategory } from "../types";
import { formatDate, formatMonthShort, todayISO } from "../utils/date";
import { celulaNumero, celulaTexto } from "../utils/csv";
import { formatAxisValue, formatMoney, formatPercent } from "../utils/money";
import { CategoryIcon, EmptyState, ProgressBar, Skeleton } from "../components/ui/Common";
import { Segmented } from "../components/ui/Form";
import { IconAlert, IconDownload, IconList, IconPercent } from "../components/ui/Icons";

type Atalho = "3m" | "6m" | "12m" | "ano" | "livre";

const ATALHOS: { value: Atalho; label: string }[] = [
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "ano", label: "Este ano" },
  { value: "livre", label: "Escolher" },
];

/** Data de hoje menos N meses, no formato "YYYY-MM-DD". */
function mesesAtras(meses: number) {
  const hoje = new Date();
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth() - meses, hoje.getDate());
  return alvo.toISOString().slice(0, 10);
}

function periodoDoAtalho(atalho: Atalho): { de: string; ate: string } {
  const ate = todayISO();
  if (atalho === "ano") return { de: `${ate.slice(0, 4)}-01-01`, ate };
  const meses = atalho === "12m" ? 12 : atalho === "6m" ? 6 : 3;
  return { de: mesesAtras(meses), ate };
}

/**
 * Relatório de período livre: para onde o dinheiro foi, como isso se compara
 * com o período anterior do mesmo tamanho e a evolução dentro dele. O resto do
 * app trabalha mês a mês; aqui é a visão de temporada.
 */
export function Reports() {
  const [atalho, setAtalho] = useState<Atalho>("6m");
  const [periodo, setPeriodo] = useState(() => periodoDoAtalho("6m"));

  const { data, error, loading, reload } = useFetch<Report>(
    `/reports?from=${periodo.de}&to=${periodo.ate}`,
  );

  function trocarAtalho(novo: Atalho) {
    setAtalho(novo);
    if (novo !== "livre") setPeriodo(periodoDoAtalho(novo));
  }

  function exportarCsv() {
    if (!data) return;
    const linhas = [
      ["Categoria", "Tipo", "Total", "% do tipo", "Média mensal", "Período anterior", "Variação %"].map(celulaTexto),
      ...data.despesasPorCategoria.map((c) => linhaCsv(c, "despesa")),
      ...data.receitasPorCategoria.map((c) => linhaCsv(c, "receita")),
    ];
    const csv = linhas.map((linha) => linha.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzz-relatorio-${periodo.de}-a-${periodo.ate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">
            Para onde o dinheiro foi em um período maior que o mês
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportarCsv} disabled={!data}>
            <IconDownload size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="toolbar">
        <Segmented<Atalho> label="Período" value={atalho} onChange={trocarAtalho} options={ATALHOS} />
        {atalho === "livre" && (
          <>
            <input
              type="date"
              className="input"
              value={periodo.de}
              max={periodo.ate}
              onChange={(e) => e.target.value && setPeriodo({ ...periodo, de: e.target.value })}
              aria-label="Data inicial"
              style={{ width: "auto" }}
            />
            <input
              type="date"
              className="input"
              value={periodo.ate}
              min={periodo.de}
              onChange={(e) => e.target.value && setPeriodo({ ...periodo, ate: e.target.value })}
              aria-label="Data final"
              style={{ width: "auto" }}
            />
          </>
        )}
      </div>

      {error && !data ? (
        <div className="card">
          <EmptyState
            icon={<IconAlert />}
            title="Não foi possível gerar o relatório"
            description={error}
            action={
              <button className="btn btn-secondary" onClick={reload}>
                Tentar novamente
              </button>
            }
          />
        </div>
      ) : !data ? (
        <div className="grid grid-kpi">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card kpi">
              <Skeleton width={90} height={12} />
              <Skeleton width="70%" height={26} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1, display: "contents" }}>
          <Resumo data={data} />
          <div className="grid grid-main">
            <LinhaDoTempo data={data} />
            <MaioresGastos data={data} />
          </div>
          <div className="grid grid-halves">
            <Categorias
              titulo="Para onde foi"
              subtitulo={`${formatMoney(data.resumo.saidas)} em despesas`}
              itens={data.despesasPorCategoria}
            />
            <Categorias
              titulo="De onde veio"
              subtitulo={`${formatMoney(data.resumo.entradas)} em entradas`}
              itens={data.receitasPorCategoria}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function linhaCsv(c: ReportCategory, tipo: string) {
  return [
    celulaTexto(c.name),
    celulaTexto(tipo),
    celulaNumero(c.total),
    celulaNumero(c.percentual, 1),
    celulaNumero(c.mediaMensal),
    celulaNumero(c.anterior),
    c.variacao === null ? "" : celulaNumero(c.variacao, 1),
  ];
}

/** Variação em relação ao período anterior, com a cor certa para o tipo. */
function Variacao({ valor, gastoMenorEhBom }: { valor: number | null; gastoMenorEhBom: boolean }) {
  if (valor === null) return <span className="delta neutral">sem base anterior</span>;
  if (Math.abs(valor) < 0.5) return <span className="delta neutral">= período anterior</span>;
  const bom = valor < 0 === gastoMenorEhBom;
  return (
    <span className={`delta ${bom ? "good" : "bad"}`}>
      {valor > 0 ? "↑" : "↓"} {formatPercent(Math.abs(valor), 1)}
    </span>
  );
}

function variacaoEntre(atual: number, anterior: number) {
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

function Resumo({ data }: { data: Report }) {
  const { resumo, anterior, periodo } = data;
  return (
    <>
      <div className="grid grid-kpi">
        <div className="card kpi">
          <div className="kpi-label">Entradas</div>
          <div className="kpi-value text-in">{formatMoney(resumo.entradas)}</div>
          <div className="kpi-foot">
            <Variacao valor={variacaoEntre(resumo.entradas, anterior.entradas)} gastoMenorEhBom={false} />
            <span>vs período anterior</span>
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Saídas</div>
          <div className="kpi-value">{formatMoney(resumo.saidas)}</div>
          <div className="kpi-foot">
            <Variacao valor={variacaoEntre(resumo.saidas, anterior.saidas)} gastoMenorEhBom />
            <span>vs período anterior</span>
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Saldo do período</div>
          <div className={`kpi-value ${resumo.saldo < 0 ? "text-out" : ""}`}>
            {formatMoney(resumo.saldo)}
          </div>
          <div className="kpi-foot">
            <span>
              {resumo.lancamentos} lançamentos em {periodo.meses.toString().replace(".", ",")} meses
            </span>
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Média mensal de gastos</div>
          <div className="kpi-value">{formatMoney(resumo.mediaMensalSaidas)}</div>
          <div className="kpi-foot">
            <span>entram {formatMoney(resumo.mediaMensalEntradas)} por mês</span>
          </div>
        </div>
      </div>

      {resumo.pendentes.quantidade > 0 && (
        <div className="alert alert-info">
          <IconAlert size={16} />
          <span>
            {formatMoney(resumo.pendentes.valor)} em {resumo.pendentes.quantidade}{" "}
            {resumo.pendentes.quantidade === 1 ? "lançamento" : "lançamentos"} ainda pendentes estão
            somados acima — é o resultado do período, não o que já saiu da conta.
          </span>
        </div>
      )}
    </>
  );
}

function LinhaDoTempo({ data }: { data: Report }) {
  const colors = useThemeColors(["--series-in", "--series-out", "--grid", "--text-3", "--surface-hover"]);
  const porMes = data.periodo.agrupamento === "month";
  const pontos = useMemo(
    () =>
      data.linhaDoTempo.map((ponto) => ({
        ...ponto,
        rotulo: porMes ? formatMonthShort(ponto.inicio) : formatDate(ponto.inicio).slice(0, 5),
      })),
    [data.linhaDoTempo, porMes],
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Evolução</h2>
          <p className="card-subtitle">
            {formatDate(data.periodo.de)} a {formatDate(data.periodo.ate)} ·{" "}
            {porMes ? "por mês" : "por semana"}
          </p>
        </div>
        <div className="chart-legend">
          <span>
            <span className="legend-swatch" style={{ background: "var(--series-in)" }} /> Entradas
          </span>
          <span>
            <span className="legend-swatch" style={{ background: "var(--series-out)" }} /> Saídas
          </span>
        </div>
      </div>
      {pontos.length === 0 ? (
        <EmptyState icon={<IconList />} title="Sem lançamentos nesse período" />
      ) : (
        <div style={{ height: 240, marginLeft: -8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pontos} barGap={2} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={colors["--grid"]} />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 12, fill: colors["--text-3"] }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatAxisValue}
                tick={{ fontSize: 11, fill: colors["--text-3"] }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                cursor={{ fill: colors["--surface-hover"] }}
                content={<PontoTooltip porMes={porMes} />}
              />
              <Bar dataKey="entradas" name="Entradas" fill={colors["--series-in"]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="saidas" name="Saídas" fill={colors["--series-out"]} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Caixinha do gráfico: entradas, saídas e saldo do ponto. */
function PontoTooltip({
  active,
  payload,
  porMes,
}: {
  active?: boolean;
  payload?: { payload: { rotulo: string; entradas: number; saidas: number; saldo: number } }[];
  porMes: boolean;
}) {
  const ponto = payload?.[0]?.payload;
  if (!active || !ponto) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">
        {porMes ? ponto.rotulo : `Semana de ${ponto.rotulo}`}
      </div>
      <div className="chart-tooltip-row">
        <span>
          <span className="legend-swatch" style={{ background: "var(--series-in)" }} /> Entradas
        </span>
        <strong>{formatMoney(ponto.entradas)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>
          <span className="legend-swatch" style={{ background: "var(--series-out)" }} /> Saídas
        </span>
        <strong>{formatMoney(ponto.saidas)}</strong>
      </div>
      <div
        className="chart-tooltip-row"
        style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 5 }}
      >
        <span>Saldo</span>
        <strong className={ponto.saldo < 0 ? "text-out" : ""}>{formatMoney(ponto.saldo)}</strong>
      </div>
    </div>
  );
}

function Categorias({
  titulo,
  subtitulo,
  itens,
}: {
  titulo: string;
  subtitulo: string;
  itens: ReportCategory[];
}) {
  const maior = Math.max(...itens.map((i) => i.total), 1);
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">{titulo}</h2>
          <p className="card-subtitle">{subtitulo}</p>
        </div>
      </div>
      {itens.length === 0 ? (
        <EmptyState icon={<IconPercent />} title="Nada nesse período" />
      ) : (
        <div className="list">
          {itens.map((item) => (
            <div key={`${item.categoryId ?? 0}`} className="list-row" style={{ alignItems: "flex-start" }}>
              <CategoryIcon name={item.name} color={item.color} />
              <div className="row-main">
                <div className="category-bar-top">
                  <span className="row-title">{item.name}</span>
                  <span className="nowrap tabular">
                    <strong>{formatMoney(item.total)}</strong>
                  </span>
                </div>
                <ProgressBar percent={(item.total / maior) * 100} />
                <div className="row-meta" style={{ justifyContent: "space-between" }}>
                  <span>
                    {formatPercent(item.percentual, 1)} · {formatMoney(item.mediaMensal)}/mês ·{" "}
                    {item.quantidade} {item.quantidade === 1 ? "lançamento" : "lançamentos"}
                  </span>
                  <Variacao valor={item.variacao} gastoMenorEhBom />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MaioresGastos({ data }: { data: Report }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Maiores gastos</h2>
          <p className="card-subtitle">Os oito que mais pesaram no período</p>
        </div>
      </div>
      {data.maioresGastos.length === 0 ? (
        <EmptyState icon={<IconList />} title="Sem despesas nesse período" />
      ) : (
        <div className="list">
          {data.maioresGastos.map((gasto) => (
            <div key={gasto.id} className="list-row">
              <CategoryIcon name={gasto.categoria ?? gasto.descricao} color={gasto.cor} />
              <div className="row-main">
                <div className="row-title">
                  {gasto.descricao ?? "Sem descrição"}
                  {!gasto.settled && (
                    <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                      a pagar
                    </span>
                  )}
                </div>
                <div className="row-meta">
                  {formatDate(gasto.data)}
                  {gasto.categoria && ` · ${gasto.categoria}`}
                  {gasto.origem && ` · ${gasto.origem}`}
                </div>
              </div>
              <div className="row-amount">{formatMoney(gasto.valor)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
