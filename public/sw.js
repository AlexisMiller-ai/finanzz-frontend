/*
 * Service worker do Finanzz.
 *
 * Objetivo: o app abrir instalado na tela inicial, mesmo sem internet. Dois
 * caches:
 *   shell     -> index.html, manifest e ícones (o esqueleto do app)
 *   estaticos -> /assets/* e as fontes (nomes com hash, então valem para sempre)
 *
 * As respostas da API ficam fora daqui: como ela é de outra origem, o cache
 * das consultas é feito no próprio app (src/services/offlineCache.ts), que já
 * tem o token do usuário em mãos. Só leitura é guardada; criar, editar e
 * excluir exigem internet.
 */

const VERSAO = "v1";
const SHELL = `finanzz-shell-${VERSAO}`;
const ESTATICOS = `finanzz-estaticos-${VERSAO}`;
const MEUS_CACHES = [SHELL, ESTATICOS];

const SHELL_ARQUIVOS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

const FONTES = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            // Só os caches deste service worker. O cache das consultas é do app
            // (offlineCache.ts) e não pode ser apagado numa atualização.
            .filter(
              (nome) =>
                (nome.startsWith("finanzz-shell-") || nome.startsWith("finanzz-estaticos-")) &&
                !MEUS_CACHES.includes(nome),
            )
            .map((nome) => caches.delete(nome)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cachePrimeiro(request, nomeDoCache) {
  const cache = await caches.open(nomeDoCache);
  const guardado = await cache.match(request, { ignoreVary: true });
  if (guardado) return guardado;
  const resposta = await fetch(request);
  if (resposta.ok || resposta.type === "opaque") cache.put(request, resposta.clone());
  return resposta;
}

/** Navegação: tenta a rede e, sem ela, serve o app guardado. */
async function navegacao(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL);
    return (await cache.match("/index.html")) || (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(navegacao(request));
    return;
  }

  const estatico =
    (url.origin === self.location.origin &&
      (url.pathname.startsWith("/assets/") || SHELL_ARQUIVOS.includes(url.pathname))) ||
    FONTES.includes(url.origin);

  if (estatico) event.respondWith(cachePrimeiro(request, ESTATICOS));
});
