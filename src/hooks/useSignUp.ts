import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import type { SignUpBody } from "../types/user";

export function useSignUp() {
  return useMutation({
    mutationFn: (body: SignUpBody) => authService.signUp(body),
  });
}
