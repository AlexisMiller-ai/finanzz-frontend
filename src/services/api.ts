import axios from "axios";

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Primeira chamada depois de um tempo parado pode falhar enquanto o
    // servidor e o banco acordam: repete uma vez antes de mostrar erro.
    const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (config && !config._retried && isTransient(error) && (config.method ?? "get") === "get") {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return api.request(config);
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
