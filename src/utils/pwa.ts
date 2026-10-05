import { useEffect, useState } from "react";

/**
 * Instalação na tela inicial e funcionamento sem internet.
 * O service worker (public/sw.js) guarda o app e as respostas GET da API;
 * aqui ficam o registro, o aviso de versão nova e o botão de instalar.
 */

type PromptDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let promptGuardado: PromptDeInstalacao | null = null;
const inscritos = new Set<(instalavel: boolean) => void>();

function avisarInscritos() {
  for (const inscrito of inscritos) inscrito(promptGuardado !== null);
}

if (typeof window !== "undefined") {
  // O navegador só oferece a instalação uma vez; guardamos o evento para
  // mostrar o botão onde faz sentido, em vez de depender do menu do navegador.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptGuardado = event as PromptDeInstalacao;
    avisarInscritos();
  });
  window.addEventListener("appinstalled", () => {
    promptGuardado = null;
    avisarInscritos();
  });
}

/** Registra o service worker e avisa quando há uma versão nova esperando. */
export function registrarServiceWorker(aoAtualizar: () => void) {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  navigator.serviceWorker
    .register("/sw.js")
    .then((registro) => {
      registro.addEventListener("updatefound", () => {
        const novo = registro.installing;
        if (!novo) return;
        novo.addEventListener("statechange", () => {
          // Só é atualização se já havia uma versão controlando a página.
          if (novo.state === "installed" && navigator.serviceWorker.controller) aoAtualizar();
        });
      });
    })
    .catch(() => {
      // Sem service worker o app funciona igual, só não abre sem internet.
    });
}

/** true quando o navegador topa instalar o app na tela inicial. */
export function useInstalavel() {
  const [instalavel, setInstalavel] = useState(promptGuardado !== null);
  useEffect(() => {
    inscritos.add(setInstalavel);
    return () => {
      inscritos.delete(setInstalavel);
    };
  }, []);
  return instalavel;
}

/** Abre o convite de instalação do navegador. Devolve true se foi instalado. */
export async function instalarApp() {
  if (!promptGuardado) return false;
  await promptGuardado.prompt();
  const escolha = await promptGuardado.userChoice;
  if (escolha.outcome === "accepted") {
    promptGuardado = null;
    avisarInscritos();
    return true;
  }
  return false;
}

/** true quando o app está aberto instalado (sem a barra do navegador). */
export function estaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS não implementa display-mode e usa essa propriedade própria.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad: a instalação é manual, pelo menu Compartilhar do Safari. */
export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Acompanha a conexão para o app avisar que está mostrando dados guardados. */
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const entrou = () => setOnline(true);
    const caiu = () => setOnline(false);
    window.addEventListener("online", entrou);
    window.addEventListener("offline", caiu);
    return () => {
      window.removeEventListener("online", entrou);
      window.removeEventListener("offline", caiu);
    };
  }, []);
  return online;
}
