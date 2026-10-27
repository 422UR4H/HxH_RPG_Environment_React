import { isApiError } from "../../services/httpClient";
import {
  CONNECTION_ERROR_MESSAGE,
  getApiErrorDetail,
  isConnectionError,
} from "../../utils/apiError";

export function getLoginErrorMessage(err: unknown): string {
  if (isConnectionError(err)) return CONNECTION_ERROR_MESSAGE;
  // O 422 é e-mail/senha fora dos limites de tamanho: nenhuma conta existe assim, então a
  // resposta é a mesma do 401 e não revela qual campo errou.
  if (isApiError(err, 401) || isApiError(err, 422)) return "E-mail ou senha incorretos.";
  if (isApiError(err, 400)) return "Preencha o e-mail e a senha.";
  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

export const EMAIL_REQUIRED = "Informe o e-mail.";
export const EMAIL_INVALID = "E-mail inválido.";
export const EMAIL_LENGTH = "O e-mail deve ter entre 12 e 64 caracteres.";
export const NICK_REQUIRED = "Informe um nick.";
export const NICK_LENGTH = "O nick deve ter entre 3 e 20 caracteres.";
export const PASSWORD_REQUIRED = "Informe a senha.";
export const PASSWORD_TOO_SHORT = "A senha deve ter pelo menos 8 caracteres.";
export const PASSWORD_TOO_LONG = "A senha deve ter no máximo 64 caracteres.";
export const CONFIRM_REQUIRED = "Confirme a senha.";
export const PASSWORDS_MISMATCH = "As senhas não coincidem.";

const registerValidationMessages: Record<string, string> = {
  "validation error: nickname is required": NICK_REQUIRED,
  "validation error: nickname must be between 3 and 20 characters": NICK_LENGTH,
  "validation error: nickname already exists": "Esse nick já está em uso. Escolha outro.",
  "validation error: email is required": EMAIL_REQUIRED,
  "validation error: invalid email format": EMAIL_INVALID,
  "validation error: email must be between 12 and 64 characters": EMAIL_LENGTH,
  "validation error: email already exists": "Já existe uma conta com esse e-mail.",
  "validation error: password is required": PASSWORD_REQUIRED,
  "validation error: confirm password is required": CONFIRM_REQUIRED,
  "validation error: password must be longer than 8 characters": PASSWORD_TOO_SHORT,
  "validation error: password is too long": PASSWORD_TOO_LONG,
  "validation error: passwords mismatch": PASSWORDS_MISMATCH,
};

export function getRegisterErrorMessage(err: unknown): string {
  if (isConnectionError(err)) return CONNECTION_ERROR_MESSAGE;
  const detail = getApiErrorDetail(err);
  return (
    (detail !== null ? registerValidationMessages[detail] : undefined) ??
    "Não foi possível criar a conta. Tente novamente."
  );
}
