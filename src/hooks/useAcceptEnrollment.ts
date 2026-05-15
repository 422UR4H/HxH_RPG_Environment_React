import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useAcceptEnrollment(
  token: string | null,
  matchId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) =>
      matchService.acceptEnrollment(token!, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchEnrollments", token, matchId],
      });
    },
  });
}
