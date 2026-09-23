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
import type { FogState, Piece, TacticalMap, WallSegment } from "../../../types/tacticalMap";

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
  };
}
