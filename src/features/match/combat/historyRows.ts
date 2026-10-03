import type { TableEvent } from "./combatReducer";
import type { RoundMode } from "./combatMessages";
import type { HistoryMasterAction, HistoryScene, HistoryTurn, MatchHistory } from "../../../types/matchHistory";

type RestBase = { source: "rest"; key: string; at: number };

export type HistoryRow =
  | (RestBase & { kind: "turn"; turn: HistoryTurn })
  | (RestBase & { kind: "scene"; scene: HistoryScene })
  | (RestBase & { kind: "round_closed" })
  | (RestBase & { kind: "round_mode_changed"; mode: RoundMode })
  | (RestBase & { kind: "master_action"; masterAction: HistoryMasterAction })
  | { source: "live"; key: string; at: number; event: TableEvent };

/**
 * Eventos ao vivo que o REST cobre: o servidor grava ANTES de emitir — o turno antes de
 * qualquer mensagem do fechamento, a cena nova antes do `scene_changed`, a troca de regime
 * antes do `round_mode_changed`, o fim do round e o seguinte antes do `round_closed` (B15) —,
 * então um fetch que começou depois do carimbo de chegada da mensagem (no mesmo milissegundo,
 * inclusive — ver a regra abaixo) sempre o contém.
 * A resolução liquidada não tem `kind` próprio: o reducer a pendura no `turn_closed`.
 */
const REST_COVERED = new Set<TableEvent["kind"]>([
  "turn_closed", "hp_changed", "round_closed", "round_mode_changed", "scene_changed",
]);

export function historyRows(
  history: MatchHistory | undefined,
  events: TableEvent[],
  fetchStartedAt: number | undefined,
  openTurnId: string | undefined,
): HistoryRow[] {
  const rest: HistoryRow[] = [];
  for (const scene of history?.scenes ?? []) {
    rest.push({ source: "rest", kind: "scene", key: `rest:scene:${scene.uuid}`, at: Date.parse(scene.createdAt), scene });
    scene.rounds.forEach((round, i) => {
      for (const ev of round.events) {
        const at = Date.parse(ev.createdAt);
        const key = `rest:event:${ev.uuid}`;
        if (ev.kind === "roundModeChanged") rest.push({ source: "rest", kind: "round_mode_changed", key, at, mode: ev.payload.to });
        else rest.push({ source: "rest", kind: "master_action", key, at, masterAction: ev.masterAction });
      }
      for (const turn of round.turns) {
        rest.push({ source: "rest", kind: "turn", key: `rest:${turn.uuid}`, at: Date.parse(turn.finishedAt ?? turn.createdAt), turn });
      }
      // O último round de uma cena fecha com a troca de cena, e ao vivo isso é só o
      // `scene_changed` — sem `round_closed`. Só o que acabou por falta de quem pagasse
      // (outro round nasceu na mesma cena) é "Fim do round".
      if (round.finishedAt && i < scene.rounds.length - 1) {
        rest.push({ source: "rest", kind: "round_closed", key: `rest:round_closed:${round.uuid}`, at: Date.parse(round.finishedAt) });
      }
    });
  }

  const live: HistoryRow[] = [];
  events.forEach((event, i) => {
    if (event.kind === "turn_opened" && event.turnId !== openTurnId) return;
    // `>=`, não `>`: o refetch que a mensagem dispara roda no MESMO stack síncrono que
    // carimbou o receivedAt (dispatch → invalidateQueries → queryFn), quase sempre no mesmo
    // milissegundo, e começa depois do carimbo na ordem do programa. Um fetch que já estava em
    // voo é cancelado pela invalidação (cancelRefetch) — os dados dele nunca aparecem. Com `>`
    // o turno fechado sairia duplicado (e a linha ♥, que chega antes do turn_closed, ficaria).
    if (REST_COVERED.has(event.kind) && fetchStartedAt !== undefined && fetchStartedAt >= event.receivedAt) return;
    live.push({ source: "live", key: `live:${event.kind}:${event.at}:${i}`, at: event.at, event });
  });

  // Estável: REST vem antes no array, e o sort do JS é estável — empate fica REST antes, e
  // entre linhas do REST na mesma hora (precisão de segundo) a ordem da árvore desempata.
  return [...rest, ...live].sort((a, b) => a.at - b.at);
}
