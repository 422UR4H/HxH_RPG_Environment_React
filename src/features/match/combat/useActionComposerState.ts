// O rascunho de ação ligado ao tabuleiro — compartilhado pelas telas do jogador e do mestre.
// A diferença entre os dois papéis (quem pode ser ator, o que um toque sem ator faz) fica na
// página; daqui para baixo é o mesmo rascunho, a mesma resolução e o mesmo envio.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GridShape, Piece, SlotCoord, WallSegment } from "../../../types/tacticalMap";
import { isSameSlot, slotToTriple, tripleToSlot } from "../../tactical-map/utils/coords";
import { isPathClear, wallContactSlots } from "../../tactical-map/utils/wallReach";
import type { IntentPreview } from "../../tactical-map/IntentLayer";
import {
  buildEnqueuePayload, chooseDestination, chooseTarget, chooseWallTarget, clearDraft, draftVerdict,
  emptyDraft, loadDraft, purgeLegacyMatchStorage, resolveDraft, saveDraft, toggleTarget, toggleWallTarget,
} from "./actionDraft";
import type { ActionDraft, DraftTarget, ReachContext } from "./actionDraft";
import type { MoveCategory } from "./combatMessages";

const NO_WALLS: WallSegment[] = [];

const FALLBACK_GRID: GridShape = {
  kind: "square", cols: 0, rows: 0, cellSize: 1, skewRatio: 1, rotation: 0,
  color: "#000", opacity: 0, lineStyle: "solid",
};

export function useActionComposerState({
  matchId,
  actorId,
  boardPieces,
  walls = NO_WALLS,
  grid,
  defaultCategory,
  defaultWeapon,
}: {
  matchId: string | undefined;
  actorId: string | undefined;
  boardPieces: Piece[];
  /** As paredes ao vivo do tabuleiro: alvos possíveis, e o que bloqueia a aproximação. */
  walls?: WallSegment[];
  grid: GridShape | undefined;
  defaultCategory: MoveCategory;
  /** A arma com que o ataque abre quando o rascunho não escolheu uma. */
  defaultWeapon?: string;
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

  /**
   * Devolve um rascunho perdido — só se o do ator estiver vazio (não atropela o que o jogador
   * começou). `true` = voltou: o aviso só diz que o rascunho voltou quando é verdade.
   */
  const restoreDraftFor = useCallback(
    (actor: string, next: ActionDraft): boolean => {
      if (!matchId) return false;
      const isEmpty = (d: ActionDraft) => d.moveMode === "none" && !d.act;
      if (actor === actorId) {
        if (!isEmpty(draft)) return false;
        updateDraft(next);
        return true;
      }
      if (!isEmpty(loadDraft(matchId, actor))) return false;
      saveDraft(matchId, actor, next);
      return true;
    },
    [matchId, actorId, draft, updateDraft],
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

  const wallById = useMemo(() => new Map(walls.map((w) => [w.id, w])), [walls]);

  const ctx = useMemo<ReachContext>(() => {
    const g = grid ?? FALLBACK_GRID;
    return {
      grid: g,
      actorSlot: actorPiece?.coord.slot,
      actorZ: actorPiece?.coord.z ?? 0,
      targetOf: (id): DraftTarget | undefined => {
        const slot = pieceByCharacter.get(id)?.coord.slot;
        if (slot) return { kind: "character", slot };
        const wall = wallById.get(id);
        return wall ? { kind: "wall", wall, reach: wallContactSlots(wall, g) } : undefined;
      },
      isFree: (slot) => !boardPieces.some((p) => p.characterId !== actorId && isSameSlot(p.coord.slot, slot)),
      isPathClear: (from, to) => isPathClear(from, to, walls, g),
    };
  }, [grid, actorPiece, pieceByCharacter, wallById, walls, boardPieces, actorId]);

  const resolved = useMemo(
    () => resolveDraft(draft, ctx, defaultCategory, defaultWeapon),
    [draft, ctx, defaultCategory, defaultWeapon],
  );
  const verdict = draftVerdict(resolved);
  const from = actorPiece ? slotToTriple(actorPiece.coord.slot, actorPiece.coord.z) : undefined;
  const payload = actorId ? buildEnqueuePayload(resolved, actorId, from) : null;

  const targetPieceIds = useMemo(() => {
    const ids = new Set<string>();
    resolved.act?.targets.forEach((id) => {
      const p = pieceByCharacter.get(id);
      if (p) ids.add(p.id);
    });
    return ids;
  }, [resolved.act, pieceByCharacter]);

  const preview = useMemo<IntentPreview | undefined>(() => {
    if (!actorId || !grid) return undefined;
    const to = resolved.move?.to ? tripleToSlot(resolved.move.to, grid.kind) : undefined;
    const ids = resolved.act?.targets ?? [];
    const targets = ids
      .map((id) => pieceByCharacter.get(id)?.coord.slot)
      .filter((s): s is SlotCoord => !!s);
    const targetWalls = ids
      .map((id) => wallById.get(id))
      .filter((w): w is WallSegment => !!w)
      .map((w) => ({ p1: w.p1, p2: w.p2 }));
    if (!to && targets.length === 0 && targetWalls.length === 0) return undefined;
    return { from: actorPiece?.coord.slot, to, auto: resolved.move?.auto ?? false, targets, targetWalls };
  }, [actorId, grid, resolved, pieceByCharacter, wallById, actorPiece]);

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
  const onWallTap = useCallback(
    (wall: WallSegment) => updateDraft(chooseWallTarget(draft, wall)),
    [draft, updateDraft],
  );
  const onWallHold = useCallback(
    (wall: WallSegment) => updateDraft(toggleWallTarget(draft, wall)),
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
    onWallTap,
    onWallHold,
    clearDraftFor,
    restoreDraftFor,
  };
}
