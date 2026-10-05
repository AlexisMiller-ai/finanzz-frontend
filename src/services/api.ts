import axios from "axios";
import { guardarResposta, lerResposta } from "./offlineCache";

export const TOKEN_KEY = "finanzz_token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token expirado/inválido: limpa a sessão e volta para o login,
// em vez de deixar as telas quebradas com erro 401.
/** Erros temporários: servidor dormindo, sem rede ou banco acordando. */
function isTransient(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return !error.response || error.code === "ECONNABORTED" || status === 502 || status === 503 || status === 504;
}

const ehGet = (config: { method?: string } | undefined) => (config?.method ?? "get") === "get";

api.interceptors.response.use(
  (response) => {
    // Consulta que deu certo vira a cópia offline daquela tela.
    if (ehGet(response.config) && response.config.url) {
      void guardarResposta(response.config.url, response.data);
    }
    return response;
  },
  async (error) => {
    // Primeira chamada depois de um tempo parado pode falhar enquanto o
    // servidor e o banco acordam: repete uma vez antes de mostrar erro.
    const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    // Sem internet não adianta repetir: vai direto para a cópia guardada.
    if (config && !config._retried && navigator.onLine && isTransient(error) && (config.method ?? "get") === "get") {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api.request(config);
    }

    // Sem rede (ou servidor fora), a consulta responde com o que foi guardado
    // na última vez. A faixa de "sem conexão" avisa que os dados são de antes.
    if (config && ehGet(config) && config.url && !error.response) {
      const guardado = await lerResposta(config.url);
      if (guardado) {
        return {
          data: guardado.dados,
          status: 200,
          statusText: "OK (offline)",
          headers: {},
          config,
          request: null,
        };
      }
    }

    const isAuthRoute = String(error.config?.url ?? "").startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthRoute && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login?expirada=1");
    }
    return Promise.reject(error);
  },
);

/** Mensagem amigável para exibir ao usuário a partir de um erro da API. */
export function getErrorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (error.code === "ECONNABORTED") return "O servidor demorou para responder. Tente novamente.";
    if (!error.response) return "Sem conexão com o servidor.";
    if (error.response.status >= 502) return "O servidor está indisponível no momento. Tente de novo em instantes.";
  }
  return fallback;
}
