// O que as duas telas da partida têm em comum na reação (spec §4.5, §4.6): quem pode reagir,
// em que pé está cada alvo, o diálogo de configuração, a escolha da casa da fuga e o envio.
// A página só diz quais personagens são "dela" (`mine`) e onde desenhar os botões.
import { useCallback, useMemo, useState } from "react";
import type { Piece, SlotCoord } from "../../../types/tacticalMap";
import { slotToTriple } from "../../tactical-map/utils/coords";
import type { AttachReactionPayload, ReactionKind } from "./combatMessages";
import type { CombatState } from "./combatReducer";
import {
  buildReactionPayload, needsDestination, reactableTargets, reactionKindOf, reactionStatusOf,
} from "./reactionModel";
import type { ReactionButton, ReactionStatus } from "./reactionModel";

/**
 * A escolha armada guarda o turno e o `match_full_state` em que nasceu: fora deles ela não
 * vale mais (Review Focus 4) — o turno que ela mirava acabou, ou o tabuleiro pode não ser
 * mais o que o servidor tem. O diálogo segue a mesma regra: ele também mira um turno.
 */
type Armed<T> = T & { turnId: string; seq: number };

export function useReactionControls({
  state,
  mine,
  boardPieces,
  send,
  fullStateSeq = 0,
}: {
  state: CombatState;
  /** Os personagens por quem esta tela reage (jogador: os seus; mestre: os NPCs). */
  mine: ReadonlySet<string>;
  boardPieces: Piece[];
  send: { attachReaction: (p: AttachReactionPayload, turnId: string) => boolean };
  /** O contador de `match_full_state` de `useGameTable`: cada reconexão derruba a escolha. */
  fullStateSeq?: number;
}) {
  const { openTurn, ownReactions } = state;
  const turnId = openTurn?.turnId;
  const reactToId = openTurn?.actionId;
  const { attachReaction } = send;

  const targets = useMemo<Array<{ actorId: string; status: ReactionStatus }>>(
    () =>
      reactableTargets(openTurn, mine).map((actorId) => ({
        actorId,
        status: reactionStatusOf(actorId, ownReactions, turnId),
      })),
    [openTurn, mine, ownReactions, turnId],
  );

  // Só reage quem ainda está "available" neste turno: o servidor recusa o segundo attach, e
  // um toque repetido (ou a escolha da casa depois de outro botão) não deve nem tentar.
  const canReact = useCallback(
    (actorId: string) => targets.some((t) => t.actorId === actorId && t.status === "available"),
    [targets],
  );
  const stillValid = useCallback(
    <T,>(armed: Armed<T> | null): armed is Armed<T> =>
      !!armed && armed.turnId === turnId && armed.seq === fullStateSeq,
    [turnId, fullStateSeq],
  );

  const [rawDialog, setDialog] = useState<Armed<{ actorId: string; initial: ReactionButton }> | null>(null);
  const [rawPick, setPick] = useState<Armed<{ actorId: string; kind: ReactionKind }> | null>(null);
  const dialogArmed = stillValid(rawDialog) && canReact(rawDialog.actorId) ? rawDialog : null;
  const pickArmed = stillValid(rawPick) && canReact(rawPick.actorId) ? rawPick : null;

  const sendReaction = useCallback(
    (actorId: string, kind: ReactionKind, extra: { position?: [number, number, number]; weapon?: string }) => {
      if (!turnId || !reactToId || !canReact(actorId)) return false;
      return attachReaction(buildReactionPayload({ actorId, reactToId, kind, ...extra }), turnId);
    },
    [turnId, reactToId, canReact, attachReaction],
  );

  // A fuga precisa da casa: arma a escolha no mapa em vez de enviar. O toque na casa já envia,
  // sem confirmar — a reação tem de ser rápida, e um toque errado faz parte do jogo. O resto
  // sai na hora.
  const reactWith = useCallback(
    (actorId: string, kind: ReactionKind, weapon?: string) => {
      if (!turnId || !canReact(actorId)) return;
      if (needsDestination(kind)) {
        setPick({ actorId, kind, turnId, seq: fullStateSeq });
        return;
      }
      setPick(null);
      sendReaction(actorId, kind, { weapon });
    },
    [turnId, canReact, fullStateSeq, sendReaction],
  );

  const configure = useCallback(
    (actorId: string, b: ReactionButton) => {
      if (!turnId || !canReact(actorId)) return;
      setPick(null);
      setDialog({ actorId, initial: b, turnId, seq: fullStateSeq });
    },
    [turnId, canReact, fullStateSeq],
  );

  // Repelir sempre abre a caixa (spec §14): a arma muda o resultado, e a caixa já vem com a do
  // rascunho do personagem (ou Desarmado). Os outros botões enviam no toque.
  const quick = useCallback(
    (actorId: string, b: ReactionButton) => {
      if (reactionKindOf(b, false) === "repel") {
        configure(actorId, b);
        return;
      }
      reactWith(actorId, reactionKindOf(b, false));
    },
    [reactWith, configure],
  );

  const closeDialog = useCallback(() => setDialog(null), []);

  const sendFromDialog = useCallback(
    (r: { kind: ReactionKind; weapon?: string }) => {
      setDialog(null);
      if (dialogArmed) reactWith(dialogArmed.actorId, r.kind, r.weapon);
    },
    [dialogArmed, reactWith],
  );

  const cancelPick = useCallback(() => setPick(null), []);

  /** `true` quando o toque era da escolha da casa (consumido, o compositor não o vê). Envia. */
  const onSlotForPick = useCallback(
    (slot: SlotCoord): boolean => {
      if (!pickArmed) return false;
      // Mais de uma peça do mesmo personagem: vale a de menor id, a regra do servidor.
      const piece = boardPieces
        .filter((p) => p.characterId === pickArmed.actorId)
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      const z = piece?.coord.z ?? 0;
      // Envio que não saiu (sem conexão) mantém a escolha: o toque pode ser repetido.
      if (sendReaction(pickArmed.actorId, pickArmed.kind, { position: slotToTriple(slot, z) })) setPick(null);
      return true;
    },
    [pickArmed, boardPieces, sendReaction],
  );

  return {
    targets,
    quick,
    configure,
    dialog: dialogArmed ? { actorId: dialogArmed.actorId, initial: dialogArmed.initial } : null,
    closeDialog,
    sendFromDialog,
    pick: pickArmed ? { actorId: pickArmed.actorId, kind: pickArmed.kind } : null,
    cancelPick,
    onSlotForPick,
  };
}
