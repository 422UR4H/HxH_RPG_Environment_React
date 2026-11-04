import type { Bar, BarsPayload, RoundMode } from "./combatMessages";

// Fora de CharacterBarsStrip.tsx para o arquivo do componente só exportar componente (Fast Refresh).
/** U+2212 MINUS SIGN — não é hífen. */
const MINUS = "−";

/** "A velocidade do round é a média de todas as ações que ele fez" (barra-de-acao.md). */
export function mean(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

/**
 * O sinal vem do valor JÁ arredondado, não do original: -0.04 arredonda para 0, e "−0"
 * pareceria débito quando não é nem crédito nem débito de verdade.
 */
export const fmt = (n: number) => {
  const r = Math.round(Math.abs(n) * 10) / 10;
  return r === 0 ? "0" : `${n < 0 ? MINUS : ""}${r}`;
};

/** Preço da barra: o congelado vence o provisório (que só o mestre recebe). */
export function priceOf(bars: BarsPayload, bar: Bar): { price: number; provisional: boolean } | undefined {
  const frozen = bars.prices[bar];
  if (frozen !== undefined) return { price: frozen, provisional: false };
  const provisional = bars.provisionalPrices[bar];
  return provisional !== undefined ? { price: provisional, provisional: true } : undefined;
}

/** As linhas da tira: filtra uma vez só (o botão "Barras" e a tira usam o mesmo resultado). Só existe em Disputado (D5). */
export function barsRows(bars: BarsPayload | null | undefined, roundMode: RoundMode | ""): BarsPayload["characters"] {
  if (roundMode !== "Race") return [];
  return bars ? bars.characters.filter((c) => hasBarsData(c, bars, roundMode)) : [];
}

/** Uma linha só vale quando mostra algo além do nome: alguma velocidade (aberta, pendente ou adiada) ou, em Disputado, uma barra já precificada. */
export function hasBarsData(
  c: BarsPayload["characters"][number],
  bars: BarsPayload,
  roundMode: RoundMode | "",
): boolean {
  const speeds = [
    c.actionSpeeds, c.moveSpeeds, c.pendingActionSpeeds, c.pendingMoveSpeeds,
    c.deferredActionSpeeds, c.deferredMoveSpeeds,
  ];
  if (speeds.some((l) => l.length > 0)) return true;
  return roundMode === "Race" && (["action", "move"] as Bar[]).some((b) => priceOf(bars, b) !== undefined);
}
