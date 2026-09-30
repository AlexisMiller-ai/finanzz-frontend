/**
 * Leitura de extratos e faturas: CSV (formatos variados de banco) e OFX.
 * Tudo é processado no navegador — o arquivo não é enviado para lugar nenhum.
 */

export interface ParsedRow {
  /** "YYYY-MM-DD" */
  date: string;
  description: string;
  /** Positivo = entrada, negativo = saída (no extrato). */
  amount: number;
  /** Identificador da origem, quando existir (FITID do OFX). */
  externalId?: string;
}

export interface CsvTable {
  headers: string[];
  rows: string[][];
  delimiter: string;
  hasHeader: boolean;
}

export interface CsvMapping {
  date: number;
  description: number;
  /** Coluna de valor único (positivo/negativo). */
  amount: number;
  /** Ou duas colunas separadas: entrada e saída. */
  amountIn?: number;
  amountOut?: number;
}

/* ---------------- Leitura do arquivo ---------------- */

/** Lê o arquivo como texto, lidando com acentos de arquivos antigos (Windows-1252). */
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);
const BOM = String.fromCharCode(0xfeff);

export async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  // Caractere de substituição indica que não era UTF-8.
  if (utf8.includes(REPLACEMENT_CHAR)) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  return utf8;
}

/* ---------------- Valores e datas ---------------- */

/**
 * Converte texto em número, aceitando "1.234,56", "1,234.56", "R$ 90,00",
 * "(50,00)" (negativo) e sufixos "D"/"C" usados por alguns bancos.
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  // Alguns extratos marcam débito/crédito com um "D" ou "C" no fim do valor.
  const suffix = text.match(/\d\s*([DC])$/i)?.[1]?.toUpperCase();
  if (suffix === "D") negative = true;
  const isCredit = suffix === "C";

  text = text.replace(/[rR]\$/g, "").replace(/[^\d.,+-]/g, "");
  if (text.includes("-")) negative = true;
  text = text.replace(/[+-]/g, "");
  if (!text) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    // O separador que vem por último é o decimal.
    normalized =
      lastComma > lastDot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // "1,5" é decimal; "1,234" com 3 casas é separador de milhar.
    const decimals = text.length - lastComma - 1;
    normalized = decimals === 3 ? text.replace(/,/g, "") : text.replace(",", ".");
  } else if (lastDot >= 0) {
    const decimals = text.length - lastDot - 1;
    normalized = decimals === 3 ? text.replace(/\./g, "") : text;
  } else {
    normalized = text;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const signed = negative && !isCredit ? -Math.abs(value) : value;
  return Math.round(signed * 100) / 100;
}

const DATE_PATTERNS: { regex: RegExp; order: ("d" | "m" | "y")[] }[] = [
  { regex: /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/, order: ["y", "m", "d"] },
  { regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/, order: ["d", "m", "y"] },
  { regex: /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/, order: ["d", "m", "y"] },
  { regex: /^(\d{4})(\d{2})(\d{2})/, order: ["y", "m", "d"] }, // OFX: 20260915...
];

/** Converte data de vários formatos para "YYYY-MM-DD". Assume dia antes de mês (padrão BR). */
export function parseDate(raw: string): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  for (const { regex, order } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;

    const parts: Record<string, number> = {};
    order.forEach((key, i) => {
      parts[key] = Number(match[i + 1]);
    });

    let { y = 0, m = 0, d = 0 } = parts;
    if (y < 100) y += 2000;
    // Formato americano em arquivo internacional: 03/15/2026 não existe como dia 15 do mês 3.
    if (m > 12 && d <= 12) [d, m] = [m, d];
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;

    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

/* ---------------- CSV ---------------- */

function detectDelimiter(sample: string): string {
  const candidates = [";", ",", "\t", "|"];
  let best = ",";
  let bestScore = -1;
  for (const candidate of candidates) {
    const counts = sample
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .slice(0, 10)
      .map((line) => line.split(candidate).length);
    if (counts.length === 0) continue;
    const average = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (average > bestScore) {
      bestScore = average;
      best = candidate;
    }
  }
  return best;
}

/** Divide o texto em linhas e colunas respeitando aspas. */
function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (insideQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      insideQuotes = true;
    } else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
}

export function parseCsv(text: string): CsvTable {
  const clean = text.startsWith(BOM) ? text.slice(1) : text;
  const delimiter = detectDelimiter(clean);
  const all = splitCsv(clean, delimiter);
  if (all.length === 0) return { headers: [], rows: [], delimiter, hasHeader: false };

  const first = all[0]!;
  // Se a primeira linha não tem data nem valor reconhecível, é cabeçalho.
  const hasHeader = !first.some((cell) => parseDate(cell)) && !first.some((cell) => parseAmount(cell) !== null);

  return {
    headers: hasHeader ? first : first.map((_, i) => `Coluna ${i + 1}`),
    rows: hasHeader ? all.slice(1) : all,
    delimiter,
    hasHeader,
  };
}

const DATE_WORDS = ["data", "date", "dia", "lançamento", "lancamento", "movimento"];
const DESCRIPTION_WORDS = ["desc", "histórico", "historico", "lançamento", "lancamento", "estabelecimento", "memo", "detalhe", "title", "name"];
const AMOUNT_WORDS = ["valor", "amount", "montante", "quantia"];
const IN_WORDS = ["crédito", "credito", "entrada", "receita"];
const OUT_WORDS = ["débito", "debito", "saída", "saida", "despesa"];

function findHeader(headers: string[], words: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase());
  return normalized.findIndex((header) => words.some((word) => header.includes(word)));
}

/** Descobre quais colunas são data, descrição e valor. */
export function guessMapping(table: CsvTable): CsvMapping {
  const { headers, rows } = table;

  let date = findHeader(headers, DATE_WORDS);
  let description = findHeader(headers, DESCRIPTION_WORDS);
  let amount = findHeader(headers, AMOUNT_WORDS);
  const amountIn = findHeader(headers, IN_WORDS);
  const amountOut = findHeader(headers, OUT_WORDS);

  const sample = rows.slice(0, 20);
  const columnCount = Math.max(...sample.map((r) => r.length), headers.length);

  // Sem cabeçalho útil: descobre pelo conteúdo das colunas.
  if (date < 0) {
    for (let col = 0; col < columnCount; col++) {
      const hits = sample.filter((r) => parseDate(r[col] ?? "")).length;
      if (hits > sample.length / 2) {
        date = col;
        break;
      }
    }
  }
  if (amount < 0 && amountIn < 0 && amountOut < 0) {
    for (let col = columnCount - 1; col >= 0; col--) {
      if (col === date) continue;
      const hits = sample.filter((r) => parseAmount(r[col] ?? "") !== null).length;
      if (hits > sample.length / 2) {
        amount = col;
        break;
      }
    }
  }
  if (description < 0) {
    let bestLength = -1;
    for (let col = 0; col < columnCount; col++) {
      if (col === date || col === amount) continue;
      const average =
        sample.reduce((acc, r) => acc + (r[col] ?? "").length, 0) / (sample.length || 1);
      const looksNumeric = sample.every((r) => parseAmount(r[col] ?? "") !== null);
      if (!looksNumeric && average > bestLength) {
        bestLength = average;
        description = col;
      }
    }
  }

  const mapping: CsvMapping = {
    date: Math.max(date, 0),
    description: Math.max(description, 0),
    amount: Math.max(amount, 0),
  };
  if (amountIn >= 0) mapping.amountIn = amountIn;
  if (amountOut >= 0) mapping.amountOut = amountOut;
  return mapping;
}

export function rowsFromCsv(table: CsvTable, mapping: CsvMapping): ParsedRow[] {
  const result: ParsedRow[] = [];

  for (const row of table.rows) {
    const date = parseDate(row[mapping.date] ?? "");
    if (!date) continue;

    let amount: number | null = null;
    if (mapping.amountIn !== undefined || mapping.amountOut !== undefined) {
      const entrada = mapping.amountIn !== undefined ? parseAmount(row[mapping.amountIn] ?? "") : null;
      const saida = mapping.amountOut !== undefined ? parseAmount(row[mapping.amountOut] ?? "") : null;
      if (entrada) amount = Math.abs(entrada);
      else if (saida) amount = -Math.abs(saida);
    } else {
      amount = parseAmount(row[mapping.amount] ?? "");
    }
    if (amount === null || amount === 0) continue;

    result.push({
      date,
      description: (row[mapping.description] ?? "").replace(/\s+/g, " ").trim(),
      amount,
    });
  }

  return result;
}

/* ---------------- OFX ---------------- */

function ofxTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return match?.[1]?.trim() ?? "";
}

export function parseOfx(text: string): ParsedRow[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];

  return blocks.flatMap((block) => {
    const date = parseDate(ofxTag(block, "DTPOSTED"));
    const amount = parseAmount(ofxTag(block, "TRNAMT"));
    if (!date || amount === null || amount === 0) return [];

    const name = ofxTag(block, "NAME");
    const memo = ofxTag(block, "MEMO");
    const description = [name, memo]
      .filter(Boolean)
      .filter((part, i, list) => list.indexOf(part) === i)
      .join(" - ")
      .replace(/\s+/g, " ")
      .trim();
    const fitid = ofxTag(block, "FITID");

    const row: ParsedRow = { date, description, amount };
    if (fitid) row.externalId = `ofx:${fitid}`.slice(0, 80);
    return [row];
  });
}

export function isOfx(fileName: string, content: string): boolean {
  return /\.ofx$/i.test(fileName) || /<STMTTRN>/i.test(content);
}

/* ---------------- Identificador para linhas de CSV ---------------- */

/** Hash curto e estável da linha, para reconhecer reimportação do mesmo arquivo. */
export function rowFingerprint(row: ParsedRow, occurrence: number): string {
  const base = `${row.date}|${row.amount.toFixed(2)}|${row.description.toLowerCase()}|${occurrence}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) | 0;
  }
  return `csv:${Math.abs(hash).toString(36)}:${row.date}:${Math.abs(Math.round(row.amount * 100))}:${occurrence}`.slice(0, 80);
}

/** Numera linhas idênticas dentro do mesmo arquivo (1ª, 2ª, ...). */
export function withFingerprints(rows: ParsedRow[]): ParsedRow[] {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    if (row.externalId) return row;
    const key = `${row.date}|${row.amount}|${row.description}`;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return { ...row, externalId: rowFingerprint(row, occurrence) };
  });
}
