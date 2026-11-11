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

/** Corta em `max` caracteres (code points), para emoji contar 1 como no back (`maxLength` conta UTF-16). */
export function clampChars(s: string, max: number): string {
  return [...s].slice(0, max).join("");
}

export const NO_EMOJI_MESSAGE = "Emojis não são permitidos neste campo.";

// Faixas de code points tratadas como emoji (inclusivas). O back tem a MESMA tabela em
// System_X_System/internal/domain/emoji.go; mantenha as duas idênticas. ZWJ (U+200D) fica de fora.
const EMOJI_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00a9, 0x00a9], [0x00ae, 0x00ae], [0x203c, 0x203c], [0x2049, 0x2049],
  [0x2122, 0x2122], [0x2139, 0x2139], [0x2194, 0x2199], [0x21a9, 0x21aa],
  [0x231a, 0x231b], [0x2328, 0x2328], [0x23cf, 0x23cf], [0x23e9, 0x23f3],
  [0x23f8, 0x23fa], [0x24c2, 0x24c2], [0x25aa, 0x25ab], [0x25b6, 0x25b6],
  [0x25c0, 0x25c0], [0x25fb, 0x25fe], [0x2600, 0x27bf], [0x2934, 0x2935],
  [0x2b05, 0x2b07], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55],
  [0x3030, 0x3030], [0x303d, 0x303d], [0x3297, 0x3297], [0x3299, 0x3299],
  [0xfe0f, 0xfe0f], [0x20e3, 0x20e3], [0x1f000, 0x1faff], [0xe0020, 0xe007f],
];

/** Informa se `s` tem algum code point nas faixas de emoji. */
export function containsEmoji(s: string): boolean {
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (EMOJI_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) return true;
  }
  return false;
}
