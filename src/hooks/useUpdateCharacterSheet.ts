import { useMutation, useQueryClient } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";
import type { CharacterSheet } from "../types/characterSheet";
import type { CharacterClass } from "../types/characterClass";

export function useUpdateCharacterSheet(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, charSheet, charClass }: { uuid: string; charSheet: CharacterSheet; charClass?: CharacterClass }) =>
      characterSheetsService.updateCharacterSheet(token!, uuid, charSheet, charClass),
    onSuccess: (_, { uuid }) => {
      queryClient.invalidateQueries({ queryKey: ["characterSheet", token, uuid] });
    },
  });
}
