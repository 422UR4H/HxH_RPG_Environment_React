import { useMutation, useQueryClient } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useDeleteCharacterSheet(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => characterSheetsService.deleteCharacterSheet(token!, uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characterSheets", token] });
    },
  });
}
