import { createContext, useState, type ReactNode } from "react";
import type { Auth } from "../types/auth";

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

export function TokenProvider({ children }: TokenProviderProps) {
  const lsToken = localStorage.getItem("token")
    ? (JSON.parse(localStorage.getItem("token") as string) as Auth | null)
    : null;

  const [token, setToken] = useState<string | null>(lsToken?.token || null);

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
