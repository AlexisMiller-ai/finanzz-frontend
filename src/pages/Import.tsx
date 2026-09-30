import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { useFetch } from "../hooks/useFetch";
import type { Category, PaymentMethod, Transaction, TransactionType } from "../types";
import { createCategorySuggester } from "../utils/categorySuggestion";
import {
  type CsvMapping,
  type CsvTable,
  type ParsedRow,
  guessMapping,
  isOfx,
  parseCsv,
  parseOfx,
  readFileText,
  rowsFromCsv,
  withFingerprints,
} from "../utils/importParsers";
import { formatDate, formatMonthLabel, getCurrentMonth } from "../utils/date";
import { formatMoney } from "../utils/money";
import { EmptyState, Skeleton } from "../components/ui/Common";
import { Field, FormError, Segmented } from "../components/ui/Form";
import { IconAlert, IconCheck, IconDownload, IconInfo, IconList } from "../components/ui/Icons";

type Source = "extrato" | "fatura";

interface PreviewItem {
  index: number;
  row: ParsedRow;
  type: TransactionType;
  categoryId: number | "";
  include: boolean;
  duplicate: boolean;
  error?: string;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
}

interface ApiRow {
  date: string;
  amount: number;
  type: TransactionType;
  description: string;
  category_id: number | null;
  payment_method: PaymentMethod;
  purchase_date?: string;
  external_id?: string;
}

export function Import() {
  const { month, notifyDataChanged } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: categories = [] } = useFetch<Category[]>("/categories");
  const { data: history } = useFetch<Transaction[]>("/transactions");

  const [fileName, setFileName] = useState("");
  const [source, setSource] = useState<Source>("extrato");
  const [billingMonth, setBillingMonth] = useState(month || getCurrentMonth());
  const [payment, setPayment] = useState<PaymentMethod>("debito");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [bulkCategory, setBulkCategory] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const suggest = useMemo(
    () => createCategorySuggester(history ?? [], categories),
    [history, categories],
  );

  const parsedRows = useMemo(() => {
    if (!table || !mapping) return rows ?? [];
    return rowsFromCsv(table, mapping);
  }, [table, mapping, rows]);

  /**
   * Numa fatura, as compras aparecem todas com o mesmo sinal — positivo nos CSVs
   * (Nubank) e negativo nos OFX de cartão. O sinal que domina o arquivo é o das
   * compras; o outro é pagamento da fatura ou estorno, que não é despesa.
   */
  const purchaseSign = useMemo(() => {
    const negatives = parsedRows.filter((r) => r.amount < 0).length;
    return negatives > parsedRows.length - negatives ? -1 : 1;
  }, [parsedRows]);
  const usableRows =
    source === "fatura" ? parsedRows.filter((r) => Math.sign(r.amount) === purchaseSign) : parsedRows;
  const ignoredCredits = source === "fatura" ? parsedRows.length - usableRows.length : 0;

  function reset() {
    setFileName("");
    setTable(null);
    setMapping(null);
    setRows(null);
    setItems(null);
    setResult(null);
    setError(null);
  }

  async function handleFile(file: File) {
    reset();
    setBusy(true);
    try {
      const text = await readFileText(file);
      setFileName(file.name);

      if (isOfx(file.name, text)) {
        const parsed = parseOfx(text);
        if (parsed.length === 0) {
          setError("Não encontrei lançamentos nesse arquivo OFX.");
        }
        setRows(parsed);
        // OFX de fatura costuma vir com valores negativos; o usuário escolhe a origem.
      } else {
        const csv = parseCsv(text);
        if (csv.rows.length === 0) {
          setError("Não encontrei linhas nesse arquivo.");
        }
        setTable(csv);
        setMapping(guessMapping(csv));
      }
    } catch (err) {
      console.error(err);
      setError("Não consegui ler esse arquivo. Tente exportar de novo em CSV ou OFX.");
    } finally {
      setBusy(false);
    }
  }

  function toApiRow(row: ParsedRow, type: TransactionType, categoryId: number | ""): ApiRow {
    const isCard = source === "fatura";
    const apiRow: ApiRow = {
      date: isCard ? `${billingMonth}-01` : row.date,
      amount: Math.abs(row.amount),
      type,
      description: row.description || "Sem descrição",
      category_id: categoryId === "" ? null : categoryId,
      payment_method: isCard ? "credito" : type === "receita" ? "dinheiro" : payment,
    };
    if (isCard) apiRow.purchase_date = row.date;
    if (row.externalId) apiRow.external_id = row.externalId;
    return apiRow;
  }

  /** Manda as linhas para o servidor só para saber o que já existe (não grava nada). */
  async function analyze() {
    setError(null);
    const withIds = withFingerprints(usableRows);
    if (withIds.length === 0) {
      setError("Nenhuma linha válida encontrada. Confira as colunas escolhidas.");
      return;
    }
    if (withIds.length > 500) {
      setError(`O arquivo tem ${withIds.length} linhas. O limite por importação é 500.`);
      return;
    }

    const draft: PreviewItem[] = withIds.map((row, index) => {
      const type: TransactionType =
        source === "fatura" ? "despesa" : row.amount > 0 ? "receita" : "despesa";
      return {
        index,
        row,
        type,
        categoryId: suggest(row.description, type) ?? "",
        include: true,
        duplicate: false,
      };
    });

    setBusy(true);
    try {
      const res = await api.post<{ results: { index: number; status: string; message?: string }[] }>(
        "/transactions/import",
        {
          dry_run: true,
          transactions: draft.map((item) => toApiRow(item.row, item.type, item.categoryId)),
        },
      );

      const byIndex = new Map(res.data.results.map((r) => [r.index, r]));
      setItems(
        draft.map((item) => {
          const status = byIndex.get(item.index);
          const duplicate = status?.status === "duplicate";
          const failed = status?.status === "error";
          return {
            ...item,
            duplicate,
            include: !duplicate && !failed,
            ...(failed && status?.message ? { error: status.message } : {}),
          };
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Não consegui analisar o arquivo."));
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!items) return;
    const selected = items.filter((item) => item.include && !item.error);
    if (selected.length === 0) {
      setError("Selecione ao menos um lançamento.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await api.post<ImportResult>("/transactions/import", {
        transactions: selected.map((item) => toApiRow(item.row, item.type, item.categoryId)),
      });
      setResult(res.data);
      setItems(null);
      notifyDataChanged();
      toast(`${res.data.imported} lançamentos importados`);
    } catch (err) {
      setError(getErrorMessage(err, "Não consegui importar os lançamentos."));
    } finally {
      setBusy(false);
    }
  }

  function updateItem(index: number, changes: Partial<PreviewItem>) {
    setItems((list) => list?.map((item) => (item.index === index ? { ...item, ...changes } : item)) ?? null);
  }

  const selectedCount = items?.filter((i) => i.include && !i.error).length ?? 0;
  const duplicateCount = items?.filter((i) => i.duplicate).length ?? 0;
  const errorCount = items?.filter((i) => i.error).length ?? 0;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Importar lançamentos</h1>
          <p className="page-subtitle">
            Traga o extrato da conta ou a fatura do cartão em CSV ou OFX, em vez de digitar tudo.
          </p>
        </div>
      </div>

      {result ? (
        <div className="card">
          <EmptyState
            icon={<IconCheck />}
            title={`${result.imported} ${result.imported === 1 ? "lançamento importado" : "lançamentos importados"}`}
            description={
              <>
                {result.duplicates > 0 && <div>{result.duplicates} já existiam e foram ignorados.</div>}
                {result.errors > 0 && <div>{result.errors} linhas tinham problema e não entraram.</div>}
              </>
            }
            action={
              <div className="page-actions" style={{ justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => navigate("/transacoes")}>
                  Ver lançamentos
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                  Importar outro arquivo
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {/* Passo 1: arquivo */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">1. Escolha o arquivo</h2>
                <p className="card-subtitle">
                  No app do banco, exporte o extrato ou a fatura em CSV ou OFX. O arquivo é lido aqui no
                  navegador; só os lançamentos que você confirmar são salvos.
                </p>
              </div>
            </div>

            <label
              className={`dropzone ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <input
                type="file"
                accept=".csv,.ofx,.txt,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <IconDownload size={22} />
              <strong>{fileName || "Arraste o arquivo aqui ou clique para escolher"}</strong>
              <span className="field-hint">CSV ou OFX, até 500 lançamentos por vez</span>
            </label>
          </div>

          {/* Passo 2: como ler */}
          {(rows || table) && (
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">2. Como interpretar</h2>
                  <p className="card-subtitle">{parsedRows.length} linhas reconhecidas no arquivo</p>
                </div>
              </div>

              <div className="form-stack">
                <Field
                  label="Origem do arquivo"
                  hint={
                    source === "fatura"
                      ? "Tudo vira despesa no cartão de crédito, com a data da compra preservada. Linhas de pagamento da fatura e estorno são ignoradas."
                      : "Valores positivos viram receita e negativos viram despesa."
                  }
                >
                  <Segmented
                    label="Origem"
                    value={source}
                    onChange={(value) => {
                      setSource(value);
                      setItems(null);
                    }}
                    options={[
                      { value: "extrato", label: "Extrato da conta" },
                      { value: "fatura", label: "Fatura do cartão" },
                    ]}
                  />
                </Field>

                {source === "fatura" ? (
                  <Field label="Mês da fatura" htmlFor="imp-fatura">
                    <input
                      id="imp-fatura"
                      type="month"
                      className="input"
                      value={billingMonth}
                      onChange={(e) => {
                        setBillingMonth(e.target.value);
                        setItems(null);
                      }}
                      style={{ maxWidth: 220 }}
                    />
                  </Field>
                ) : (
                  <Field label="Forma de pagamento das despesas">
                    <Segmented
                      label="Forma de pagamento"
                      value={payment}
                      onChange={(value) => {
                        setPayment(value);
                        setItems(null);
                      }}
                      options={[
                        { value: "debito", label: "Débito" },
                        { value: "dinheiro", label: "Pix/Dinheiro" },
                      ]}
                    />
                  </Field>
                )}

                {table && mapping && (
                  <div className="field-row">
                    <Field label="Coluna da data">
                      <ColumnSelect
                        table={table}
                        value={mapping.date}
                        onChange={(value) => {
                          setMapping({ ...mapping, date: value });
                          setItems(null);
                        }}
                      />
                    </Field>
                    <Field label="Coluna da descrição">
                      <ColumnSelect
                        table={table}
                        value={mapping.description}
                        onChange={(value) => {
                          setMapping({ ...mapping, description: value });
                          setItems(null);
                        }}
                      />
                    </Field>
                    <Field label="Coluna do valor">
                      <ColumnSelect
                        table={table}
                        value={mapping.amount}
                        onChange={(value) => {
                          setMapping({ ...mapping, amount: value, amountIn: undefined, amountOut: undefined });
                          setItems(null);
                        }}
                      />
                    </Field>
                  </div>
                )}

                {ignoredCredits > 0 && (
                  <div className="alert alert-info">
                    <IconInfo size={16} />
                    <span>
                      {ignoredCredits} {ignoredCredits === 1 ? "linha" : "linhas"} de pagamento da fatura ou
                      estorno {ignoredCredits === 1 ? "será ignorada" : "serão ignoradas"}.
                    </span>
                  </div>
                )}

                <FormError message={error} />

                <div>
                  <button className="btn btn-primary" onClick={analyze} disabled={busy || usableRows.length === 0}>
                    {busy ? <span className="spinner" /> : "Revisar lançamentos"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Passo 3: revisão */}
          {items && (
            <div className="card card-flush">
              <div className="card-header">
                <div>
                  <h2 className="card-title">3. Revise antes de importar</h2>
                  <p className="card-subtitle">
                    {selectedCount} selecionados
                    {duplicateCount > 0 && ` · ${duplicateCount} já existem`}
                    {errorCount > 0 && ` · ${errorCount} com problema`}
                  </p>
                </div>
              </div>

              <div className="toolbar" style={{ padding: "0 20px 14px" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setItems(items.map((i) => ({ ...i, include: !i.error })))}
                >
                  Selecionar todos
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setItems(items.map((i) => ({ ...i, include: false })))}
                >
                  Limpar seleção
                </button>
                <select
                  className="select"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value ? Number(e.target.value) : "")}
                  aria-label="Categoria para aplicar aos selecionados"
                >
                  <option value="">Aplicar categoria aos selecionados...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === "despesa" ? "despesa" : "receita"})
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={bulkCategory === ""}
                  onClick={() => {
                    const category = categories.find((c) => c.id === bulkCategory);
                    setItems(
                      items.map((i) =>
                        i.include && category && i.type === category.type ? { ...i, categoryId: category.id } : i,
                      ),
                    );
                  }}
                >
                  Aplicar
                </button>
              </div>

              <div className="list" style={{ maxHeight: 460, overflowY: "auto" }}>
                {items.map((item) => (
                  <div key={item.index} className="list-row import-row">
                    <input
                      type="checkbox"
                      checked={item.include}
                      disabled={!!item.error}
                      onChange={(e) => updateItem(item.index, { include: e.target.checked })}
                      aria-label={`Importar ${item.row.description}`}
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    />
                    <div className="row-main">
                      <div className="row-title">{item.row.description || "Sem descrição"}</div>
                      <div className="row-meta">
                        <span>{formatDate(item.row.date)}</span>
                        {item.duplicate && <span className="badge badge-warning">já existe</span>}
                        {item.error && <span className="badge badge-out">{item.error}</span>}
                        {source === "fatura" && <span className="badge">fatura {formatMonthLabel(billingMonth)}</span>}
                      </div>
                    </div>
                    <select
                      className="select import-category"
                      value={item.categoryId}
                      onChange={(e) =>
                        updateItem(item.index, { categoryId: e.target.value ? Number(e.target.value) : "" })
                      }
                      aria-label="Categoria"
                    >
                      <option value="">Sem categoria</option>
                      {categories
                        .filter((c) => c.type === item.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <div className={`row-amount ${item.type === "receita" ? "text-in" : ""}`}>
                      {item.type === "receita" ? "+ " : "- "}
                      {formatMoney(Math.abs(item.row.amount))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                <FormError message={error} />
                <button className="btn btn-primary" onClick={runImport} disabled={busy || selectedCount === 0}>
                  {busy ? <span className="spinner" /> : `Importar ${selectedCount} lançamentos`}
                </button>
              </div>
            </div>
          )}

          {!rows && !table && !busy && (
            <div className="card">
              <EmptyState
                icon={<IconList />}
                title="Nenhum arquivo escolhido"
                description="Dica: no Nubank, Itaú e Inter dá para exportar o extrato em CSV ou OFX pelo aplicativo."
              />
            </div>
          )}
          {busy && !items && (
            <div className="card">
              <Skeleton height={80} />
            </div>
          )}
          {error && !rows && !table && (
            <div className="alert alert-error">
              <IconAlert size={16} />
              <span>{error}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ColumnSelect({
  table,
  value,
  onChange,
}: {
  table: CsvTable;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {table.headers.map((header, index) => (
        <option key={index} value={index}>
          {header || `Coluna ${index + 1}`}
        </option>
      ))}
    </select>
  );
}
