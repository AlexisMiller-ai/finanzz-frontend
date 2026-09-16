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
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  }
  return fallback;
}
