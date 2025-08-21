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
      retry: 1,
      // staleTime: 5 * 60 * 1000, // 5 minutos
      // cacheTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ResetStyle />
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TokenProvider>
          <App />
        </TokenProvider>
      </UserProvider>
    </QueryClientProvider>
  </StrictMode>
);
