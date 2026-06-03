// src/test/render.tsx
import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TokenProvider } from "../contexts/TokenContext";
import { UserProvider } from "../contexts/UserContext";
import { NavGuardProvider } from "../contexts/NavGuardContext";
import { userFixture } from "./fixtures/user";
import type { UserStorage } from "../types/user";

interface ProvidersOptions {
  /** Pathname do MemoryRouter. Default: "/" */
  route?: string;
  /** Route pattern, ex: "/campaigns/:id". Necessário se a página usa useParams. */
  path?: string;
  /** JWT pra ser plantado em localStorage["token"]. null = não autenticado. */
  token?: string | null;
  /** UserStorage pra ser plantado em localStorage["user"]. null = sem user. */
  user?: UserStorage | null;
  /** Estado do location pra useLocation().state */
  state?: unknown;
}

const TOKEN_KEY = "token";
const USER_KEY = "user";

export function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    path,
    token = "fake-jwt-token",
    user = userFixture,
    state,
    ...rest
  }: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify({ token }));
  }
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NavGuardProvider>
          <TokenProvider>
            <UserProvider>
              <MemoryRouter
                initialEntries={[
                  state !== undefined ? { pathname: route, state } : route,
                ]}
              >
                {path ? (
                  <Routes>
                    <Route path={path} element={children} />
                  </Routes>
                ) : (
                  children
                )}
              </MemoryRouter>
            </UserProvider>
          </TokenProvider>
        </NavGuardProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
