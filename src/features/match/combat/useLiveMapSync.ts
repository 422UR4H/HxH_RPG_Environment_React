// src/features/match/combat/useLiveMapSync.ts
//
// Fila de fix (Task 13, round 1): os cinco handlers de parede/mapa, o `npcMap` e o
// `liveWalls`/`livePieces`/`fog` que eles atualizam eram idênticos entre GamePlayerPage
// e GameMasterPage — copiados verbatim. Centraliza aqui; a única diferença real entre os
// dois papéis é `seedFromRest`: o mestre é dono do tabuleiro inteiro e semeia
// `liveWalls`/`livePieces` do REST assim que o mapa carrega (sem isso ele veria o mapa
// vazio até o primeiro `map_full_state` — R11); o jogador nunca semeia do REST (só a WS é
// fonte confiável pra ele — ver o comentário em `visibleBoardPieces`).
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CampaignMaster } from "../../../types/campaign";
import type { CharacterPrivateSummary } from "../../../types/characterSheet";
import type { FogState, Piece, SlotCoord, TacticalMap, WallSegment } from "../../../types/tacticalMap";

type Options = {
  map: TacticalMap | undefined;
  campaign: CampaignMaster | undefined;
  seedFromRest: boolean;
};

export function useLiveMapSync({ map, campaign, seedFromRest }: Options) {
  const [liveWalls, setLiveWalls] = useState<WallSegment[]>([]);
  const [livePieces, setLivePieces] = useState<Piece[] | null>(null);
  const [fog, setFog] = useState<FogState>({ fogMode: "explored", visiblePolygons: [] });

  useEffect(() => {
    if (!map) return;
    setFog((f) => ({ ...f, fogMode: map.fogMode ?? "explored" }));
    if (!seedFromRest) return;
    setLiveWalls(map.walls ?? []);
    setLivePieces(map.pieces ?? null);
  }, [map, seedFromRest]);

  const handleWallStateChanged = useCallback((wallId: string, open: boolean, locked: boolean) => {
    setLiveWalls((prev) => prev.map((w) => (w.id === wallId ? { ...w, open, locked } : w)));
  }, []);

  const handleWallHpChanged = useCallback(
    (wallId: string, hp: number, maxHp: number, destroyed: boolean) => {
      setLiveWalls((prev) =>
        prev.map((w) => (w.id === wallId ? { ...w, hp, maxHp, destroyed } : w)),
      );
    },
    [],
  );

  const handleMapFullState = useCallback(
    (s: {
      pieces: Piece[];
      walls: WallSegment[];
      visiblePolygons: Array<Array<[number, number]>>;
      fogMode: "live" | "explored";
    }) => {
      setLiveWalls(s.walls);
      setLivePieces(s.pieces);
      setFog({ fogMode: s.fogMode, visiblePolygons: s.visiblePolygons });
    },
    [],
  );

  const handleVisibilityUpdated = useCallback((polys: Array<Array<[number, number]>>) => {
    setFog((f) => ({ ...f, visiblePolygons: polys }));
  }, []);

  const handleWallRevealed = useCallback((wall: WallSegment) => {
    setLiveWalls((prev) => prev.map((w) => (w.id === wall.id ? wall : w)));
  }, []);

  // F3 (amended, browser batch 2): the server moves a piece by itself when a turn (or a
  // Shift/passed-Dash escape reaction) opens. `characterId`/`visible`/`z` are OMITTED
  // (not defaulted) by useMatchWs when the wire omits them — mirrors useLobbyWs's own
  // piece_moved parsing, and LobbyPage.tsx's handler (its own version of this function)
  // patches ONLY the slot of an already-known piece for the same reason: a bare
  // "it moved to X" for a piece we already track must not stomp its characterId/visible
  // back to blank/true. Unlike the lobby, this DOES update z/characterId/visible in place
  // when the wire provides them (not just on insert) — elevation is load-bearing in
  // combat (§7.2's z "height" offset), so a piece_moved that carries a new z must apply
  // it. A piece not yet known is inserted only when characterId is present (same rule the
  // lobby uses) — without it there's no character to attach the new piece to.
  const handlePieceMoved = useCallback(
    (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean, z?: number) => {
      setLivePieces((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((p) => p.id === pieceId);
        if (idx !== -1) {
          const existing = list[idx];
          const next = [...list];
          next[idx] = {
            ...existing,
            characterId: characterId ?? existing.characterId,
            visible: visible ?? existing.visible,
            coord: { slot, z: z ?? existing.coord.z },
          };
          return next;
        }
        // Nothing to attach a brand-new piece to, and nothing actually changes — return
        // the ORIGINAL `prev` (possibly still null), not the `?? []` coercion, so a
        // dropped/no-op piece_moved can't prematurely turn "never seeded" into "known
        // empty" (visibleBoardPieces.ts treats those two very differently for the master).
        if (!characterId) return prev;
        return [...list, { id: pieceId, characterId, coord: { slot, z: z ?? 0 }, visible: visible ?? true }];
      });
    },
    [],
  );

  // F3: pairs with piece_moved — sent instead of it when the piece left this viewer's
  // fog (still exists on the board, just no longer visible to them).
  const handlePieceRemoved = useCallback((pieceId: string) => {
    setLivePieces((prev) => (prev ? prev.filter((p) => p.id !== pieceId) : prev));
  }, []);

  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

  return {
    liveWalls,
    livePieces,
    fog,
    npcMap,
    handleWallStateChanged,
    handleWallHpChanged,
    handleMapFullState,
    handleVisibilityUpdated,
    handleWallRevealed,
    handlePieceMoved,
    handlePieceRemoved,
  };
}
