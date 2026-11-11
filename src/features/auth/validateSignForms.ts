import {
  CONFIRM_REQUIRED,
  EMAIL_INVALID,
  EMAIL_LENGTH,
  EMAIL_REQUIRED,
  NICK_LENGTH,
  NICK_REQUIRED,
  PASSWORDS_MISMATCH,
  PASSWORD_REQUIRED,
  PASSWORD_TOO_LONG,
  PASSWORD_TOO_SHORT,
} from "./authErrorMessages";
import { NO_EMOJI_MESSAGE, USER_LIMITS, charLength, containsEmoji } from "../../constants/fieldLimits";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// Mesmo nível de exigência do type="email" que saiu; o back tem a palavra final.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// E-mail e senha: o back mede com len() do Go, isto é, em bytes UTF-8 (um "ã" conta 2).
// O front mede igual para não aprovar aqui o que o servidor recusa. O nick é medido em
// caracteres (code points), como o back passou a fazer.
export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

function inRange(s: string, min: number, max: number): boolean {
  const n = byteLength(s);
  return n >= min && n <= max;
}

// No login só vazio e formato do e-mail: tamanho fica com o servidor, que responde com a
// mensagem única de credencial incorreta (não revela regra de senha a quem a esqueceu).
export function validateLogin(form: {
  email: string;
  password: string;
}): FieldErrors<"email" | "password"> {
  const errors: FieldErrors<"email" | "password"> = {};
  if (form.email === "") errors.email = EMAIL_REQUIRED;
  else if (!EMAIL_FORMAT.test(form.email)) errors.email = EMAIL_INVALID;
  if (form.password === "") errors.password = PASSWORD_REQUIRED;
  return errors;
}

export function validateRegister(form: {
  email: string;
  nick: string;
  password: string;
  confirmPass: string;
}): FieldErrors<"email" | "nick" | "password" | "confirmPass"> {
  const errors: FieldErrors<"email" | "nick" | "password" | "confirmPass"> = {};
  if (form.email === "") errors.email = EMAIL_REQUIRED;
  else if (containsEmoji(form.email)) errors.email = NO_EMOJI_MESSAGE;
  else if (!EMAIL_FORMAT.test(form.email)) errors.email = EMAIL_INVALID;
  else if (!inRange(form.email, 12, 64)) errors.email = EMAIL_LENGTH;

  if (form.nick === "") errors.nick = NICK_REQUIRED;
  else if (containsEmoji(form.nick)) errors.nick = NO_EMOJI_MESSAGE;
  else if (charLength(form.nick) < USER_LIMITS.nick.min || charLength(form.nick) > USER_LIMITS.nick.max)
    errors.nick = NICK_LENGTH;

  if (form.password === "") errors.password = PASSWORD_REQUIRED;
  else if (byteLength(form.password) < 8) errors.password = PASSWORD_TOO_SHORT;
  else if (byteLength(form.password) > 64) errors.password = PASSWORD_TOO_LONG;

  if (form.confirmPass === "") errors.confirmPass = CONFIRM_REQUIRED;
  else if (form.confirmPass !== form.password) errors.confirmPass = PASSWORDS_MISMATCH;
  return errors;
}
