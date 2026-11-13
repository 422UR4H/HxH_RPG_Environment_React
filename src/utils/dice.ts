/**
 * Dano de arma como a mesa lê: "2 D12 +3". Dados do maior para o menor, iguais
 * agrupados ("2 D12"; a contagem some quando é 1), grupos separados por " + ",
 * bônus fixo no fim ("+3" / "-2"; some quando é 0).
 */
export function formatDamage(dice: number[], flat: number): string {
  const counts = new Map<number, number>();
  for (const sides of dice) counts.set(sides, (counts.get(sides) ?? 0) + 1);
  const groups = [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([sides, count]) => (count > 1 ? `${count} D${sides}` : `D${sides}`));
  const base = groups.join(" + ");
  if (!flat) return base;
  const bonus = flat > 0 ? `+${flat}` : `${flat}`;
  return base ? `${base} ${bonus}` : bonus;
}
