import { httpClient } from "./httpClient";
import type { SignInBody, SignUpBody, UserResponse } from "../types/user";

export const authService = {
  signIn: (body: SignInBody): Promise<UserResponse> =>
    httpClient.post<UserResponse>("/auth/login", body).then(({ data }) => data),

  signUp: (body: SignUpBody): Promise<UserResponse> =>
    httpClient.post<UserResponse>("/auth/register", body).then(({ data }) => data),
};
