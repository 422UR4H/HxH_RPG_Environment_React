import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { rulesService } from "../services/rulesService";

// Conteúdo estático (só muda com deploy): nunca fica velho.
const sheetRulesQuery = {
  queryKey: ["sheetRules"],
  queryFn: rulesService.getSheetRules,
  staleTime: Infinity,
  retry: 1,
};

export function useSheetRules() {
  return useQuery(sheetRulesQuery);
}

/** Busca as regras em segundo plano enquanto a ficha monta, para o "?" abrir o painel já com o
 *  texto em vez de esperar a rede. Falha aqui não aparece: o painel tenta de novo ao abrir. */
export function usePrefetchSheetRules(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (enabled) void queryClient.prefetchQuery(sheetRulesQuery);
  }, [enabled, queryClient]);
}
