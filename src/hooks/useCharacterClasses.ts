import { useQuery } from "@tanstack/react-query";
import { characterClassesService } from "../services/characterClassesService";

export function useCharacterClasses(token: string | null) {
  return useQuery({
    queryKey: ["characterClasses"], // cache automático
    queryFn: async () => {
      if (!token) throw new Error("Token inválido");
      const { data } = await characterClassesService.listCharacterClasses(
        token
      );
      return data;
    },
    enabled: !!token, // só executa se tiver o token
    retry: 1, // quantas vezes tenta antes de falhar
  });
}
