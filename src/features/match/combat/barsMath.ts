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
