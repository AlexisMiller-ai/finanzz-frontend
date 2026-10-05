/**
 * Guarda as respostas GET da API no aparelho para o app continuar útil sem
 * internet: as telas de consulta abrem com os últimos números carregados.
 *
 * Fica aqui, e não no service worker, porque a API é de outra origem — assim
 * o cache usa a mesma requisição que o app já faz, com o token do usuário.
 * Só leitura entra: criar, editar e excluir exigem internet, para nunca dar a
 * impressão de que algo foi salvo quando não foi.
 */

const CACHE = "finanzz-api-v1";

const disponivel = () => typeof caches !== "undefined";

/** Chave fixa por URL da API (o host some, então trocar de ambiente não mistura). */
function chave(url: string) {
  try {
    const { pathname, search } = new URL(url, window.location.origin);
    return `${window.location.origin}/__api__${pathname}${search}`;
  } catch {
    return null;
  }
}

export async function guardarResposta(url: string, dados: unknown) {
  if (!disponivel()) return;
  const key = chave(url);
  if (!key) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(
      key,
      new Response(JSON.stringify({ dados, em: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch {
    // Sem espaço ou sem permissão: o app segue normal, só não abre sem internet.
  }
}

export async function lerResposta<T>(url: string): Promise<{ dados: T; em: number } | null> {
  if (!disponivel()) return null;
  const key = chave(url);
  if (!key) return null;
  try {
    const cache = await caches.open(CACHE);
    const resposta = await cache.match(key);
    if (!resposta) return null;
    return (await resposta.json()) as { dados: T; em: number };
  } catch {
    return null;
  }
}

/** Chamado ao sair da conta: dados financeiros não ficam no aparelho. */
export async function limparRespostas() {
  if (!disponivel()) return;
  try {
    await caches.delete(CACHE);
  } catch {
    // nada a fazer
  }
}
