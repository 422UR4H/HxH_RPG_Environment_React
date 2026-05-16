import { useMutation, useQueryClient } from "@tanstack/react-query";
import { characterSheetsService } from "../services/characterSheetsService";

export function useRejectSheetSubmission(
  token: string | null,
  campaignId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sheetUuid: string) =>
      characterSheetsService.rejectSheetSubmission(token!, sheetUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaignDetails", token, campaignId],
      });
    },
  });
}
