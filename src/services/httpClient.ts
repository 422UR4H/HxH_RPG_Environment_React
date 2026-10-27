import axios from "axios";
import { expireSession } from "../features/auth/sessionNotice";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const httpClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export function isApiError(error: unknown, status: number): boolean {
  return axios.isAxiosError(error) && error.response?.status === status;
}

// Impede um segundo redirecionamento enquanto o primeiro acontece (várias requisições em voo
// podem receber 401 juntas).
let redirectingToLogin = false;

export function resetSessionRedirectForTests(): void {
  redirectingToLogin = false;
}

// Interceptor for global error handling
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só com token guardado: um login falho também é 401 e não pode apagar a própria mensagem.
    if (error.response?.status === 401 && localStorage.getItem("token") && !redirectingToLogin) {
      redirectingToLogin = true;
      // Sessão expirada: limpa as chaves de auth, deixa o aviso para o login e volta para lá.
      expireSession();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
