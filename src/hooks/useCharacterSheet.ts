import { useQuery } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useCharacterSheet(token: string | null, id?: string) {
  return useQuery({
    queryKey: ["characterSheet", token, id], // cache automático
    queryFn: async () => {
      if (!token || !id) throw new Error("Token ou ID inválido");
      const { data } = await characterSheetsService.getCharacterSheetDetails(
        token,
        id
      );
      return data;
    },
    enabled: !!token && !!id, // só executa se tiver os dois
    retry: 1, // quantas vezes tenta antes de falhar
  });
}
