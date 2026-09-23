// src/features/match/combat/useActionComposerState.ts
//
// O rascunho de ação (draft) e os mapas peça↔personagem são idênticos para jogador e
// mestre (R4): a diferença entre os dois papéis é só QUEM pode virar ator e o que um
// clique sem ator faz — isso continua na página. Extraído da Tarefa 12 (GamePlayerPage)
// para a Tarefa 13 (GameMasterPage) reusar sem duplicar (addendum da Tarefa 13).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadDraft, saveDraft, migrateTargets, emptyDraft } from "./actionDraft";
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

  // R8 (custo aceito pela controladoria): limpa o rascunho do ator CORRENTE quando
  // `action_enqueued` chega — a página chama isto de dentro do callback que passa a
  // `useMatchCombat`. Se o mestre trocar de NPC entre o envio e o ack, o rascunho limpo
  // é o do ator que estiver selecionado nesse instante, não necessariamente quem enviou;
  // o FIFO de fantasmas do reducer já resolve o caso que importa (qual fantasma pertence
  // a qual ação), então esse desalinhamento é só cosmético.
  const resetDraft = useCallback(() => setDraft(emptyDraft()), []);

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
    resetDraft,
  };
}
