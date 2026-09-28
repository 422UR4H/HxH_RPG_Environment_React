import type { TableEvent } from "./combatReducer";
import type { HistoryTurn, MatchHistory } from "../../../types/matchHistory";

export type HistoryRow =
  | { source: "rest"; kind: "turn"; key: string; at: number; turn: HistoryTurn }
  | { source: "live"; key: string; at: number; event: TableEvent };

/**
 * Eventos ao vivo que o REST cobre quando traz o turno: o servidor persiste o turno ANTES de
 * emitir qualquer mensagem do fechamento, então um fetch que começou depois do carimbo de
 * chegada da mensagem (no mesmo milissegundo, inclusive — ver a regra abaixo) sempre o
 * contém. Cena, regime e round fechado não estão aqui: o REST de hoje não os guarda (B15) —
 * ficam ao vivo, e recarregar os perde (perder, não divergir: §0.2).
 * A resolução liquidada não tem `kind` próprio: o reducer a pendura no `turn_closed`.
 */
const TURN_DERIVED = new Set<TableEvent["kind"]>(["turn_closed", "hp_changed"]);

export function historyRows(
  history: MatchHistory | undefined,
  events: TableEvent[],
  fetchStartedAt: number | undefined,
  openTurnId: string | undefined,
): HistoryRow[] {
  const rest: HistoryRow[] = [];
  for (const scene of history?.scenes ?? []) {
    for (const round of scene.rounds) {
      for (const turn of round.turns) {
        rest.push({ source: "rest", kind: "turn", key: `rest:${turn.uuid}`, at: Date.parse(turn.finishedAt ?? turn.createdAt), turn });
      }
    }
  }

  const live: HistoryRow[] = [];
  events.forEach((event, i) => {
    if (event.kind === "turn_opened" && event.turnId !== openTurnId) return;
    // `>=`, não `>`: o refetch que o turn_closed dispara roda no MESMO stack síncrono que
    // carimbou o receivedAt (dispatch → invalidateQueries → queryFn), quase sempre no mesmo
    // milissegundo, e começa depois do carimbo na ordem do programa. Um fetch que já estava em
    // voo é cancelado pela invalidação (cancelRefetch) — os dados dele nunca aparecem. Com `>`
    // o turno fechado sairia duplicado (e a linha ♥, que chega antes do turn_closed, ficaria).
    if (TURN_DERIVED.has(event.kind) && fetchStartedAt !== undefined && fetchStartedAt >= event.receivedAt) return;
    live.push({ source: "live", key: `live:${event.kind}:${event.at}:${i}`, at: event.at, event });
  });

  // Estável: REST vem antes no array, e o sort do JS é estável — empate fica REST antes.
  return [...rest, ...live].sort((a, b) => a.at - b.at);
}
