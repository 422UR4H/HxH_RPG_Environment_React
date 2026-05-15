import { useMutation, useQueryClient } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useSubmitCharacterSheet(
  token: string | null,
  campaignId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sheetUuid,
      campaignUuid,
    }: {
      sheetUuid: string;
      campaignUuid: string;
    }) =>
      characterSheetsService.submitCharacterSheet(token!, sheetUuid, campaignUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignDetails", token, campaignId],
      });
    },
  });
}
