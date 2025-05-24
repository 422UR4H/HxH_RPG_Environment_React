import { httpClient } from "./httpClient";
import type { SignInBody, SignUpBody, UserResponse } from "../types/user";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";

export const authService = {
  signIn: (body: SignInBody) =>
    httpClient.post<UserResponse>("/auth/login", objToSnakeCase(body)),

  signUp: (body: SignUpBody) =>
    httpClient
      .post<UserResponse>("/auth/register", objToSnakeCase(body))
      .then((response) => ({
        ...response,
        data: objToCamelCase(response.data),
      })),
};
