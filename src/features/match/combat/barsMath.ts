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

type BarsRow = BarsPayload["characters"][number];

/** Os campos de uma barra de uma linha, sem o prefixo action/move. */
export function barFields(c: BarsRow, bar: Bar) {
  return bar === "action"
    ? { carry: c.actionCarry, balance: c.actionBalance, acted: c.actionSpeeds, pending: c.pendingActionSpeeds, deferred: c.deferredActionSpeeds }
    : { carry: c.moveCarry, balance: c.moveBalance, acted: c.moveSpeeds, pending: c.pendingMoveSpeeds, deferred: c.deferredMoveSpeeds };
}

/**
 * O total da PRÓXIMA ação (D7): `carry + mean(agiram ++ [próxima])`. A próxima é a primeira pendente
 * (o mestre recebe as pendentes já na ordem projetada); as demais não contam. O jogador não recebe
 * pendentes, então para ele é `carry + mean(agiram)`. Sem velocidade nenhuma o total é o carry — a
 * média vazia vale 0, como no servidor (`BarEconomy.Mean`) —, e sem carry também não há total.
 * O que a próxima ação gasta é `total − saldo` (o saldo que chega já pagou ela).
 */
export function barTotal(c: BarsRow, bar: Bar): number | undefined {
  const { carry, acted, pending } = barFields(c, bar);
  const speeds = [...acted, ...pending.slice(0, 1)];
  if (speeds.length === 0 && carry === 0) return undefined;
  return carry + (mean(speeds) ?? 0);
}

/** Largura cheia de uma barra, a mesma para a faixa inteira: o maior `max(total, preço)` entre as linhas. */
export function barScale(rows: BarsRow[], bars: BarsPayload, bar: Bar): number {
  const price = priceOf(bars, bar)?.price ?? 0;
  return rows.reduce((m, c) => Math.max(m, barTotal(c, bar) ?? 0), Math.max(0, price));
}

/** Um traço em cada múltiplo do preço estritamente dentro da escala (na borda o fim da barra já marca). */
export function barTicks(price: number | undefined, scale: number): number[] {
  if (!price || price <= 0) return [];
  const ticks: number[] = [];
  for (let at = price; at < scale; at += price) ticks.push(at);
  return ticks;
}
