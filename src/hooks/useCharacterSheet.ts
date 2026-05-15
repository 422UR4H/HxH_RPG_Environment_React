import { useQuery } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useCharacterSheet(token: string | null, id?: string) {
  return useQuery({
    queryKey: ["characterSheet", token, id],
    queryFn: () => characterSheetsService.getCharacterSheetDetails(token!, id!),
    enabled: !!token && !!id,
    retry: 1,
  });
}
