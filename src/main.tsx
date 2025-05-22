import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ResetStyle from "./styles/ResetStyle";
import { UserProvider } from "./contexts/UserContext";
import { TokenProvider } from "./contexts/TokenContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ResetStyle />
    <UserProvider>
      <TokenProvider>
        <App />
      </TokenProvider>
    </UserProvider>
  </StrictMode>
);
