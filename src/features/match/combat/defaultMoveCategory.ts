import type { MoveCategory } from "./combatMessages";
import type { CombatState } from "./combatReducer";

/**
 * FUNÇÃO, não constante, de propósito: `barra-de-acao.md` diz que no turno livre o
 * deslocamento normalmente é Shift, e este default pode passar a seguir o regime. Desenhado
 * para ser enriquecido — não decida isso agora.
 */
export function defaultMoveCategory(_state: CombatState): MoveCategory {
  return "Dash";
}
