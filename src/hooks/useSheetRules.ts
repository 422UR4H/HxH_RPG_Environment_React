import { useQuery } from "@tanstack/react-query";
import { rulesService } from "../services/rulesService";

// Conteúdo estático (só muda com deploy): nunca fica velho.
export function useSheetRules() {
  return useQuery({
    queryKey: ["sheetRules"],
    queryFn: rulesService.getSheetRules,
    staleTime: Infinity,
    retry: 1,
  });
}
