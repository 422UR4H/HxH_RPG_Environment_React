import { isApiError } from "../../services/httpClient";
import {
  CONNECTION_ERROR_MESSAGE,
  getApiErrorDetail,
  isConnectionError,
} from "../../utils/apiError";

export function getLoginErrorMessage(err: unknown): string {
  if (isConnectionError(err)) return CONNECTION_ERROR_MESSAGE;
  // O 422 é e-mail/senha fora dos limites de tamanho: nenhuma conta existe assim, então a
  // resposta é a mesma do 401 e não revela qual campo errou. Nos demais casos, o `detail`
  // do back já é a frase de tela.
  if (isApiError(err, 422)) return "E-mail ou senha incorretos.";
  return getApiErrorDetail(err) ?? "Não foi possível entrar agora. Tente novamente em instantes.";
}

export const REGISTERED_NOTICE = "Conta criada. Entre com seu e-mail e senha.";

export const SESSION_EXPIRED_NOTICE = "Sua sessão expirou. Entre de novo.";

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

/** O `detail` do back já é a frase de tela (back #115); o texto do front só cobre a falta dele. */
export function getRegisterErrorMessage(err: unknown): string {
  if (isConnectionError(err)) return CONNECTION_ERROR_MESSAGE;
  return getApiErrorDetail(err) ?? "Não foi possível criar a conta. Tente novamente.";
}
