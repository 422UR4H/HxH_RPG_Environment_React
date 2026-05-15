import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useEnrollCharacterSheet(
  token: string | null,
  matchId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sheetUuid,
      matchUuid,
    }: {
      sheetUuid: string;
      matchUuid: string;
    }) => matchService.enrollCharacterSheet(token!, sheetUuid, matchUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchEnrollments", token, matchId],
      });
    },
  });
}
