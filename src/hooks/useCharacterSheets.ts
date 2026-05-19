import { useQuery } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";
import type { CharacterSheetSummary } from "../types/characterSheet";

export function useCharacterSheets(token: string | null) {
  return useQuery<CharacterSheetSummary[]>({
    queryKey: ["characterSheets", token],
    queryFn: () => characterSheetsService.listCharacterSheets(token!),
    enabled: !!token,
    retry: 1,
    staleTime: 0,
  });
}
