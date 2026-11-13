const ROWS = 3;

/**
 * Índices (na lista de capítulos) em que começa uma nova fileira de chips.
 * Múltiplo de 3 devolve vazio: vale a grade de 3 colunas iguais. Caso contrário, os capítulos
 * se dividem em ordem em `floor(n / 3)` fileiras, as primeiras com um chip a mais
 * (10 → 4,3,3; 11 → 4,4,3; 7 → 4,3).
 */
export function chipRowBreaks(n: number): Set<number> {
  const breaks = new Set<number>();
  if (n <= 0 || n % ROWS === 0) return breaks;
  const rows = Math.max(1, Math.floor(n / ROWS));
  const extra = n % rows;
  const base = Math.floor(n / rows);
  let index = 0;
  for (let r = 0; r < rows - 1; r++) {
    index += base + (r < extra ? 1 : 0);
    breaks.add(index);
  }
  return breaks;
}
