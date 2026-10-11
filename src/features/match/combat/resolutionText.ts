// Textos do cálculo do turno que o mestre lê (ResolutionDetails): a ordem das reações esperando
// e o desfecho de cada parede.
import type { PendingReaction, WallTurnResult } from "./combatMessages";

/**
 * As reações esperando na ordem em que o mestre as lê: maior chave (velocidade) primeiro, como a
 * fila de ações; sem velocidade (esquiva, nada) depois, pela chegada. A ordem de abrir continua
 * dele — isto só deixa explícito o que ele decide.
 */
export function orderPending(pending: PendingReaction[]): PendingReaction[] {
  return [...pending].sort((a, b) => {
    const ka = a.speed ?? Number.NEGATIVE_INFINITY;
    const kb = b.speed ?? Number.NEGATIVE_INFINITY;
    if (ka !== kb) return kb - ka;
    return (a.arrival ?? 0) - (b.arrival ?? 0);
  });
}

/** O que o turno fez à parede, numa linha. `settled`: o golpe já caiu (turno fechado). */
export function wallOutcomeText(w: WallTurnResult, settled: boolean): string {
  if (w.kind === "interact") {
    if (w.failure === "locked") return "trancada — não abriu";
    if (w.failure === "noRoll") return "tentativa sem teste — o mestre decide (destrancar pela mão dele)";
    if (w.failure) return "nada mudou";
    return w.open ? "aberta" : "fechada";
  }
  if (w.maxHp !== undefined && w.maxHp <= 0) return "indestrutível — sem dano";
  if (w.effectiveDamage <= 0) return "o golpe não venceu a resistência — sem dano";
  const verb = settled ? "perdeu" : "vai perder";
  const end = w.destroyed
    ? (settled ? " — destruída" : " — fica destruída")
    : w.hp !== undefined && w.maxHp !== undefined ? ` — fica com ${w.hp}/${w.maxHp}` : "";
  return `${verb} ${w.effectiveDamage} de vida${end}`;
}
