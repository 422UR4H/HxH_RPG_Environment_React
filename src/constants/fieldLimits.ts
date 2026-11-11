/**
 * Limites de texto dos formulários, espelhando o back (que conta em caracteres, isto é, code
 * points Unicode). Contar com `charLength`, nunca com `.length` (UTF-16) nem em bytes.
 * Exceção: e-mail e senha do usuário seguem em bytes (`byteLength` em validateSignForms).
 */

export interface LengthLimit {
  min?: number;
  max: number;
}

export const MATCH_LIMITS = {
  title: { min: 5, max: 32 },
  briefInitialDescription: { max: 255 },
} as const satisfies Record<string, LengthLimit>;

export const CAMPAIGN_LIMITS = {
  name: { min: 5, max: 32 },
  briefInitialDescription: { max: 255 },
  callLink: { max: 255 },
} as const satisfies Record<string, LengthLimit>;

export const SHEET_LIMITS = {
  nickname: { min: 3, max: 10 },
  fullname: { min: 6, max: 32 },
  briefDescription: { max: 255 },
} as const satisfies Record<string, LengthLimit>;

export const USER_LIMITS = {
  nick: { min: 3, max: 20 },
} as const satisfies Record<string, LengthLimit>;

export const MAP_LIMITS = {
  name: { min: 3 },
} as const;

/** Sessão: do instante atual até 12 meses à frente. */
export const SESSION_MAX_MONTHS = 12;

/** Tamanho em caracteres (code points), como o back conta. */
export function charLength(s: string): number {
  return [...s].length;
}
