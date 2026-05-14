import { useQuery } from "@tanstack/react-query";
import { characterClassesService } from "../services/characterClassesService";

export function useCharacterClasses(token: string | null) {
  return useQuery({
    queryKey: ["characterClasses", token],
    queryFn: () => characterClassesService.listCharacterClasses(token!),
    enabled: !!token,
    retry: 1,
  });
}
