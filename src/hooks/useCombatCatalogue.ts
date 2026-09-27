import { useQuery } from "@tanstack/react-query";
import { getCombatCatalogue } from "../services/characterSheetsService";

export function useCombatCatalogue(token: string, sheetUuid?: string) {
  return useQuery({
    queryKey: ["combat-catalogue", token, sheetUuid],
    queryFn: () => getCombatCatalogue(token, sheetUuid!),
    enabled: !!token && !!sheetUuid,
    retry: 1,
  });
}
