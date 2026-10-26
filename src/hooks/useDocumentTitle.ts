import { useEffect } from "react";

export const APP_NAME = "System X System";

// Define o título da aba: partes (mais específica primeiro) + nome do produto.
// Partes vazias são ignoradas; ao desmontar volta ao nome do produto.
export default function useDocumentTitle(
  ...parts: Array<string | null | undefined | false>
): void {
  const title = [...parts.filter(Boolean), APP_NAME].join(" · ");
  useEffect(() => {
    document.title = title;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
