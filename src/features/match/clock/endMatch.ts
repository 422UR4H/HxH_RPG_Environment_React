// Encerrar a partida (spec 2026-11-08 §5): quando o mestre pode encerrar e quando a mesa
// acabou de vez. As recusas espelham as do servidor (contrato match-clock.md, `end_match`) —
// o botão se explica antes, a recusa do servidor continua sendo a rede de segurança.
import type { MatchWsStatus } from "../../../hooks/useMatchWs";
import type { WsError } from "../combat/combatErrorMessages";
import type { SceneCategory } from "../combat/combatMessages";
import type { MatchEnded } from "./clockMessages";

/** O porquê de "Encerrar partida" travado; `null` = pode encerrar. */
export function endMatchBlockReason({
  sceneCategory,
  openTurn,
  storyAt,
}: {
  sceneCategory: SceneCategory | undefined;
  openTurn: boolean;
  storyAt: string | null | undefined;
}): string | null {
  if (sceneCategory === "battle") return "Encerre o combate antes (troque de cena).";
  if (openTurn) return "Feche o turno aberto antes.";
  if (storyAt == null) return "Defina a hora da partida antes.";
  return null;
}

/**
 * A mesa acabou: o `match_ended`, o fechamento 4002 (que também chega a quem reconecta numa
 * partida encerrada) ou a recusa `match_already_ended` de qualquer comando enviado depois do fim.
 */
export function isMatchOver({
  matchEnded,
  status,
  lastError,
}: {
  matchEnded: MatchEnded | null;
  status: MatchWsStatus;
  lastError: WsError | null;
}): boolean {
  return matchEnded !== null || status === "ended" || lastError?.code === "match_already_ended";
}

/** A página da partida — para onde vai quem estava na mesa ou no lobby de uma partida encerrada. */
export function matchPagePath(campaignId: string | undefined, matchId: string | undefined): string {
  return `/campaigns/${campaignId}/matches/${matchId}`;
}
