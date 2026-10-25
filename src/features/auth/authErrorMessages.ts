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

const registerValidationMessages: Record<string, string> = {
  "validation error: nickname is required": "Informe um nick.",
  "validation error: nickname must be between 3 and 20 characters":
    "O nick deve ter entre 3 e 20 caracteres.",
  "validation error: nickname already exists": "Esse nick já está em uso. Escolha outro.",
  "validation error: email is required": "Informe o e-mail.",
  "validation error: invalid email format": "E-mail inválido.",
  "validation error: email must be between 12 and 64 characters":
    "O e-mail deve ter entre 12 e 64 caracteres.",
  "validation error: email already exists": "Já existe uma conta com esse e-mail.",
  "validation error: password is required": "Informe a senha.",
  "validation error: confirm password is required": "Confirme a senha.",
  "validation error: password must be longer than 8 characters":
    "A senha deve ter pelo menos 8 caracteres.",
  "validation error: password is too long": "A senha deve ter no máximo 64 caracteres.",
  "validation error: passwords mismatch": "As senhas não coincidem.",
};

export function getRegisterErrorMessage(err: unknown): string {
  if (isConnectionError(err)) return CONNECTION_ERROR_MESSAGE;
  const detail = getApiErrorDetail(err);
  return (
    (detail !== null ? registerValidationMessages[detail] : undefined) ??
    "Não foi possível criar a conta. Tente novamente."
  );
}
