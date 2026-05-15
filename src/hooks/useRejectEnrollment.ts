import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchService } from "../services/matchService";

export function useRejectEnrollment(
  token: string | null,
  matchId: string | undefined
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentId: string) =>
      matchService.rejectEnrollment(token!, enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["matchEnrollments", token, matchId],
      });
    },
  });
}
