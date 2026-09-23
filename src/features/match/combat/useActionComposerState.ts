// src/features/match/combat/useActionComposerState.ts
//
// O rascunho de ação (draft) e os mapas peça↔personagem são idênticos para jogador e
// mestre (R4): a diferença entre os dois papéis é só QUEM pode virar ator e o que um
// clique sem ator faz — isso continua na página. Extraído da Tarefa 12 (GamePlayerPage)
// para a Tarefa 13 (GameMasterPage) reusar sem duplicar (addendum da Tarefa 13).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadDraft, saveDraft, clearDraft, migrateTargets, emptyDraft } from "./actionDraft";
import type { ActionDraft } from "./actionDraft";
import { defaultMoveCategory } from "./defaultMoveCategory";
import type { CombatState } from "./combatReducer";
import type { Piece, PieceCoord, SlotCoord } from "../../../types/tacticalMap";

function slotToTuple(coord: PieceCoord): [number, number, number] {
  const s = coord.slot;
  return s.kind === "square" ? [s.col, s.row, coord.z] : [s.q, s.r, coord.z];
}

export function useActionComposerState({
  matchId,
  actorId,
  boardPieces,
  state,
}: {
  matchId: string | undefined;
  actorId: string | undefined;
  boardPieces: Piece[];
  state: CombatState;
}) {
  const [draft, setDraft] = useState<ActionDraft>(emptyDraft());
  const draftLoadedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!matchId || !actorId || draftLoadedFor.current === actorId) return;
    draftLoadedFor.current = actorId;
    setDraft(loadDraft(matchId, actorId));
  }, [matchId, actorId]);

  // Sem ator (nunca acontece pro jogador; acontece pro mestre entre um NPC e outro, ou
  // depois do X): a sheet não tem pra quem desenhar, e o próximo ator carrega o dele do
  // zero — sem isso o rascunho do NPC anterior ficaria na tela.
  useEffect(() => {
    if (actorId) return;
    draftLoadedFor.current = undefined;
    setDraft(emptyDraft());
  }, [actorId]);

  const updateDraft = useCallback(
    (next: ActionDraft) => {
      setDraft(next);
      if (matchId && actorId) saveDraft(matchId, actorId, next);
    },
    [matchId, actorId],
  );

  const characterIdByPieceId = useMemo(
    () => new Map(boardPieces.map((p) => [p.id, p.characterId] as const)),
    [boardPieces],
  );

  const pieceIdsByCharacterId = useMemo(() => {
    const m = new Map<string, string[]>();
    boardPieces.forEach((p) => {
      const arr = m.get(p.characterId) ?? [];
      arr.push(p.id);
      m.set(p.characterId, arr);
    });
    return m;
  }, [boardPieces]);

  const targetPieceIds = useMemo(() => {
    const s = new Set<string>();
    draft.targets.forEach((charId) =>
      (pieceIdsByCharacterId.get(charId) ?? []).forEach((id) => s.add(id)),
    );
    return s;
  }, [draft.targets, pieceIdsByCharacterId]);

  const actorPiece = actorId ? boardPieces.find((p) => p.characterId === actorId) : undefined;
  const actorSlot = actorPiece ? slotToTuple(actorPiece.coord) : undefined;

  // Clicar numa peça marca alvo (troca a lista, migrando arma/movimento — R4); segurar
  // marca mais de um (alterna). Alvejar a própria peça é legítimo e não desfaz nada.
  const replaceTarget = useCallback(
    (characterId: string) => updateDraft(migrateTargets(draft, [characterId])),
    [draft, updateDraft],
  );

  const toggleTarget = useCallback(
    (characterId: string) => {
      const already = draft.targets.includes(characterId);
      const next = already
        ? draft.targets.filter((t) => t !== characterId)
        : [...draft.targets, characterId];
      updateDraft(migrateTargets(draft, next));
    },
    [draft, updateDraft],
  );

  const setDestination = useCallback(
    (slot: SlotCoord) => {
      const category = draft.move?.category ?? defaultMoveCategory(state);
      const z = actorPiece?.coord.z ?? 0;
      const to: [number, number, number] =
        slot.kind === "square" ? [slot.col, slot.row, z] : [slot.q, slot.r, z];
      updateDraft({ ...draft, move: { category, to } });
    },
    [draft, actorPiece, state, updateDraft],
  );

  // R28 (final review, amends R8): a página só sabe QUEM enviou (actorId) e SE deve
  // limpar (clearsDraft) depois que `action_enqueued` chega — vem da metadata do FIFO de
  // pendingSends (combatReducer/useMatchCombat), não mais "o ator atual" às cegas. Limpa
  // o localStorage do ator-alvo sempre; só mexe no rascunho EM MEMÓRIA se esse ator for o
  // que está selecionado agora — trocar de NPC (mestre) entre o envio e o ack não deve
  // fazer o rascunho do NPC novo sumir da tela por causa do ack de um NPC antigo.
  const clearDraftFor = useCallback(
    (targetActorId: string) => {
      if (!matchId) return;
      clearDraft(matchId, targetActorId);
      if (targetActorId === actorId) setDraft(emptyDraft());
    },
    [matchId, actorId],
  );

  return {
    draft,
    updateDraft,
    characterIdByPieceId,
    pieceIdsByCharacterId,
    targetPieceIds,
    actorPiece,
    actorSlot,
    replaceTarget,
    toggleTarget,
    setDestination,
    clearDraftFor,
  };
}
