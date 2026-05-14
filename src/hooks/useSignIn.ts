import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import type { SignInBody } from "../types/user";

export function useSignIn() {
  return useMutation({
    mutationFn: (body: SignInBody) => authService.signIn(body),
  });
}
