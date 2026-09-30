import type { Category, Transaction, TransactionType } from "../types";

/** Palavras que aparecem em quase toda descrição de banco e não ajudam a identificar nada. */
const NOISE = new Set([
  "compra", "cartao", "credito", "debito", "pagamento", "pag", "pix", "transferencia",
  "transf", "recebido", "enviado", "de", "da", "do", "para", "com", "em", "no", "na",
  "ltda", "me", "sa", "eireli", "brasil", "br", "parcela", "boleto", "tarifa", "conta",
]);

const DICTIONARY: { termos: string[]; categoria: string }[] = [
  { termos: ["uber", "99app", "99 ", "cabify", "posto", "shell", "ipiranga", "petrobras", "combustivel", "estacionamento", "metro", "onibus"], categoria: "transporte" },
  { termos: ["ifood", "rappi", "mercado", "supermercado", "atacad", "padaria", "restaurante", "lanchonete", "pizzaria", "hortifruti", "acougue", "burger", "mc donalds", "mcdonalds", "subway", "bar "], categoria: "alimentacao" },
  { termos: ["netflix", "spotify", "amazon prime", "disney", "hbo", "max ", "youtube premium", "icloud", "google one", "assinatura", "chatgpt", "openai"], categoria: "assinaturas" },
  { termos: ["farmacia", "drogaria", "drogasil", "pacheco", "raia", "hospital", "clinica", "laboratorio", "dentista", "plano de saude", "unimed", "psicolog"], categoria: "saude" },
  { termos: ["aluguel", "condominio", "energia", "luz", "agua", "gas", "internet", "vivo", "claro", "tim ", "oi fibra", "iptu"], categoria: "moradia" },
  { termos: ["cinema", "ingresso", "viagem", "hotel", "airbnb", "passagem", "latam", "gol ", "azul ", "booking", "show"], categoria: "lazer" },
  { termos: ["escola", "faculdade", "universidade", "curso", "udemy", "alura", "livro", "mensalidade"], categoria: "educacao" },
  { termos: ["shopping", "magazine", "americanas", "mercado livre", "mercadolivre", "shopee", "aliexpress", "renner", "riachuelo", "zara", "centauro"], categoria: "compras" },
  { termos: ["salario", "pagamento salario", "folha", "remuneracao", "proventos"], categoria: "salario" },
  { termos: ["freela", "freelance", "servico prestado", "nota fiscal"], categoria: "freelance" },
];

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word.length >= 3 && !NOISE.has(word) && !/^\d+$/.test(word));
}

/**
 * Sugere a categoria de uma descrição: primeiro pelo histórico do próprio usuário
 * (ex.: "UBER *TRIP" já foi classificado como Transporte antes), depois por um
 * dicionário de estabelecimentos comuns casado com os nomes das categorias dele.
 */
export function createCategorySuggester(history: Transaction[], categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  // token -> categoria -> quantas vezes
  const index = new Map<string, Map<number, number>>();

  for (const transaction of history) {
    if (!transaction.category_id || !transaction.description) continue;
    for (const token of tokens(transaction.description)) {
      const counts = index.get(token) ?? new Map<number, number>();
      counts.set(transaction.category_id, (counts.get(transaction.category_id) ?? 0) + 1);
      index.set(token, counts);
    }
  }

  function findByName(slug: string, type: TransactionType) {
    return categories.find((category) => {
      if (category.type !== type) return false;
      const name = normalizeText(category.name);
      return name.includes(slug) || slug.includes(name.split(" ")[0] ?? "");
    });
  }

  return function suggest(description: string, type: TransactionType): number | null {
    const words = tokens(description);

    const scores = new Map<number, number>();
    for (const word of words) {
      const counts = index.get(word);
      if (!counts) continue;
      for (const [categoryId, count] of counts) {
        if (byId.get(categoryId)?.type !== type) continue;
        scores.set(categoryId, (scores.get(categoryId) ?? 0) + count);
      }
    }

    let best: number | null = null;
    let bestScore = 0;
    for (const [categoryId, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        best = categoryId;
      }
    }
    if (best !== null) return best;

    const normalized = normalizeText(description);
    for (const entry of DICTIONARY) {
      if (entry.termos.some((termo) => normalized.includes(termo))) {
        const category = findByName(entry.categoria, type);
        if (category) return category.id;
      }
    }

    return null;
  };
}
