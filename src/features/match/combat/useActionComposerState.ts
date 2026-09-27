// O rascunho de ação ligado ao tabuleiro — compartilhado pelas telas do jogador e do mestre.
// A diferença entre os dois papéis (quem pode ser ator, o que um toque sem ator faz) fica na
// página; daqui para baixo é o mesmo rascunho, a mesma resolução e o mesmo envio.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridShape, Piece, SlotCoord } from "../../../types/tacticalMap";
import { isSameSlot, slotToTriple, tripleToSlot } from "../../tactical-map/utils/coords";
import type { IntentPreview } from "../../tactical-map/IntentLayer";
import {
  buildEnqueuePayload, chooseDestination, chooseTarget, clearDraft, draftVerdict, emptyDraft,
  loadDraft, purgeLegacyMatchStorage, resolveDraft, saveDraft, toggleTarget,
} from "./actionDraft";
import type { ActionDraft, ReachContext } from "./actionDraft";
import type { MoveCategory } from "./combatMessages";

const FALLBACK_GRID: GridShape = {
  kind: "square", cols: 0, rows: 0, cellSize: 1, skewRatio: 1, rotation: 0,
  color: "#000", opacity: 0, lineStyle: "solid",
};

export function useActionComposerState({
  matchId,
  actorId,
  boardPieces,
  grid,
  defaultCategory,
}: {
  matchId: string | undefined;
  actorId: string | undefined;
  boardPieces: Piece[];
  grid: GridShape | undefined;
  defaultCategory: MoveCategory;
}) {
  useEffect(() => { purgeLegacyMatchStorage(); }, []);

  const load = useCallback(
    (actor: string | undefined) => (matchId && actor ? loadDraft(matchId, actor) : emptyDraft()),
    [matchId],
  );
  const [draft, setDraft] = useState<ActionDraft>(() => load(actorId));
  // Trocar de ator (o mestre alternando NPCs) carrega o rascunho DAQUELE ator.
  const [draftActor, setDraftActor] = useState(actorId);
  if (draftActor !== actorId) {
    setDraftActor(actorId);
    setDraft(load(actorId));
  }

  const updateDraft = useCallback(
    (next: ActionDraft) => {
      setDraft(next);
      if (matchId && actorId) saveDraft(matchId, actorId, next);
    },
    [matchId, actorId],
  );

  /** O ack de um envio do compositor: limpa o rascunho DAQUELE ator (pode não ser o da tela). */
  const clearDraftFor = useCallback(
    (sentActorId: string) => {
      if (!matchId) return;
      clearDraft(matchId, sentActorId);
      if (sentActorId === actorId) setDraft(emptyDraft());
    },
    [matchId, actorId],
  );

  // Uma peça por personagem; se houver mais de uma, vale a de menor id — a mesma regra
  // estável que o servidor usa para escolher qual peça uma ação move.
  const pieceByCharacter = useMemo(() => {
    const m = new Map<string, Piece>();
    [...boardPieces]
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((p) => { if (!m.has(p.characterId)) m.set(p.characterId, p); });
    return m;
  }, [boardPieces]);

  const actorPiece = actorId ? pieceByCharacter.get(actorId) : undefined;

  const ctx = useMemo<ReachContext>(
    () => ({
      grid: grid ?? FALLBACK_GRID,
      actorSlot: actorPiece?.coord.slot,
      actorZ: actorPiece?.coord.z ?? 0,
      slotOf: (id) => pieceByCharacter.get(id)?.coord.slot,
      isFree: (slot) => !boardPieces.some((p) => p.characterId !== actorId && isSameSlot(p.coord.slot, slot)),
    }),
    [grid, actorPiece, pieceByCharacter, boardPieces, actorId],
  );

  const resolved = useMemo(() => resolveDraft(draft, ctx, defaultCategory), [draft, ctx, defaultCategory]);
  const verdict = draftVerdict(resolved);
  const from = actorPiece ? slotToTriple(actorPiece.coord.slot, actorPiece.coord.z) : undefined;
  const payload = actorId ? buildEnqueuePayload(resolved, actorId, from) : null;

  const targetPieceIds = useMemo(() => {
    const ids = new Set<string>();
    resolved.attack?.targets.forEach((id) => {
      const p = pieceByCharacter.get(id);
      if (p) ids.add(p.id);
    });
    return ids;
  }, [resolved.attack, pieceByCharacter]);

  const preview = useMemo<IntentPreview | undefined>(() => {
    if (!actorId || !grid) return undefined;
    const to = resolved.move?.to ? tripleToSlot(resolved.move.to, grid.kind) : undefined;
    const targets = (resolved.attack?.targets ?? [])
      .map((id) => pieceByCharacter.get(id)?.coord.slot)
      .filter((s): s is SlotCoord => !!s);
    if (!to && targets.length === 0) return undefined;
    return { from: actorPiece?.coord.slot, to, auto: resolved.move?.auto ?? false, targets };
  }, [actorId, grid, resolved, pieceByCharacter, actorPiece]);

  const onSlotTap = useCallback(
    (slot: SlotCoord) => updateDraft(chooseDestination(draft, slotToTriple(slot, actorPiece?.coord.z ?? 0))),
    [draft, actorPiece, updateDraft],
  );
  const onCharacterTap = useCallback(
    (characterId: string) => updateDraft(chooseTarget(draft, characterId)),
    [draft, updateDraft],
  );
  const onCharacterHold = useCallback(
    (characterId: string) => updateDraft(toggleTarget(draft, characterId)),
    [draft, updateDraft],
  );

  return {
    draft,
    updateDraft,
    resolved,
    verdict,
    payload,
    actorPiece,
    pieceByCharacter,
    targetPieceIds,
    preview,
    onSlotTap,
    onCharacterTap,
    onCharacterHold,
    clearDraftFor,
  };
}
