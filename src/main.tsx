import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import ResetStyle from "./styles/ResetStyle";
import { UserProvider } from "./contexts/UserContext";
import { TokenProvider } from "./contexts/TokenContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

// Após um deploy o hash dos chunks muda: a aba antiga pediria um arquivo que não existe mais.
window.addEventListener("vite:preloadError", () => window.location.reload());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ResetStyle />
    <QueryClientProvider client={queryClient}>
      {/* TokenProvider por fora: o token vencido na abertura limpa o user antes de o UserProvider ler. */}
      <TokenProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </TokenProvider>
    </QueryClientProvider>
  </StrictMode>
);
