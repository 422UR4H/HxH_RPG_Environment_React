import { httpClient } from "./httpClient";
import type { SignInBody, SignUpBody, UserResponse } from "../types/user";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";

export const authService = {
  signIn: (body: SignInBody): Promise<UserResponse> =>
    httpClient
      .post<UserResponse>("/auth/login", objToSnakeCase(body))
      .then(({ data }) => data),

  signUp: (body: SignUpBody): Promise<UserResponse> =>
    httpClient
      .post<UserResponse>("/auth/register", objToSnakeCase(body))
      .then(({ data }) => objToCamelCase<UserResponse>(data)),
};
