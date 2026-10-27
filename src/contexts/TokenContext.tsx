import { createContext, useState, type ReactNode } from "react";
import type { Auth } from "../types/auth";
import { isJwtExpired } from "../utils/jwt";
import { expireSession } from "../features/auth/sessionNotice";

export interface TokenContextType {
  token: string | null;
  login: (auth: Auth) => void;
  logout: () => void;
}

const TokenContext = createContext<TokenContextType>({
  token: null,
  login: () => {},
  logout: () => {},
});

interface TokenProviderProps {
  children: ReactNode;
}

// Token vencido no storage: descarta (com o user) e deixa o aviso, em vez de abrir telas que
// só vão tomar 401. Idempotente, então rodar duas vezes no StrictMode não faz mal.
function readStoredToken(): string | null {
  const raw = localStorage.getItem("token");
  if (!raw) return null;
  const stored = JSON.parse(raw) as Auth | null;
  if (!stored?.token) return null;
  if (isJwtExpired(stored.token)) {
    expireSession();
    return null;
  }
  return stored.token;
}

export function TokenProvider({ children }: TokenProviderProps) {
  const [token, setToken] = useState<string | null>(readStoredToken);

  function login(auth: Auth) {
    setToken(auth.token);
    localStorage.setItem("token", JSON.stringify(auth));
  }

  function logout() {
    setToken(null);
    localStorage.removeItem("token");
  }

  return (
    <TokenContext.Provider value={{ token, login, logout }}>
      {children}
    </TokenContext.Provider>
  );
}
export default TokenContext;
