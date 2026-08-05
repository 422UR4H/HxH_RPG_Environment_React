import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useResizeObserver } from "../hooks/useResizeObserver";
import { useMatchWs } from "../hooks/useMatchWs";
import type { MatchBoardSync } from "../hooks/useMatchWs";
import useUser from "../hooks/useUser";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import GamePageTemplate from "../components/templates/GamePageTemplate";
import { colors, fonts } from "../styles/tokens";
import type { CharacterPrivateSummary } from "../types/characterSheet";
import type { FogState, Piece, WallSegment } from "../types/tacticalMap";

export default function GamePage() {
  const { token } = useToken();
  const { campaignId, matchId } = useParams<{ campaignId: string; matchId: string }>();

  if (!token) return <Navigate to="/" replace />;

  return <GamePageInner token={token} campaignId={campaignId} matchId={matchId} />;
}

// ─── Inner (token is guaranteed) ────────────────────────────────────────────

function GamePageInner({
  token,
  campaignId,
  matchId,
}: {
  token: string;
  campaignId?: string;
  matchId?: string;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const { data: matchMap, isPending: matchMapPending } = useMatchMap(token, matchId);
  const { data: map, isPending: mapPending } = useMap(token, matchMap?.mapUuid);
  const { data: match } = useMatchDetails(token, matchId);
  const { data: participants = [] } = useMatchParticipants(token, matchId, true);
  const { data: campaign } = useCampaignDetails(token, campaignId);

  const { user } = useUser();

  // Live wall state: starts from REST-fetched map, updated on WS events.
  const [liveWalls, setLiveWalls] = useState<WallSegment[]>([]);
  const [wallPicker, setWallPicker] = useState<WallSegment | null>(null);
  const [livePieces, setLivePieces] = useState<Piece[] | null>(null);
  const [fog, setFog] = useState<FogState>({ fogMode: "explored", visiblePolygons: [] });

  // Sync liveWalls when the REST map loads.
  useEffect(() => {
    if (map) {
      setLiveWalls(map.walls ?? []);
      setLivePieces(map.pieces ?? null);
      setFog((f) => ({ ...f, fogMode: map.fogMode ?? "explored" }));
    }
  }, [map]);

  // Determine if current user is the master.
  const isMaster = match != null && user != null && match.masterUuid === user.uuid;

  const handleWallStateChanged = useCallback((wallId: string, open: boolean, locked: boolean) => {
    setLiveWalls((prev) =>
      prev.map((w) => (w.id === wallId ? { ...w, open, locked } : w)),
    );
  }, []);

  const handleWallHpChanged = useCallback((wallId: string, hp: number, maxHp: number, destroyed: boolean) => {
    setLiveWalls((prev) =>
        prev.map((w) => (w.id === wallId ? { ...w, hp, maxHp, destroyed } : w)),
    );
  }, []);

  const handleMapFullState = useCallback((s: {
    pieces: Piece[]; walls: WallSegment[];
    visiblePolygons: Array<Array<[number, number]>>;
    fogMode: "live" | "explored";
  }) => {
    setLiveWalls(s.walls);
    // The WS piece payload carries no elevation, so restore z from the REST map;
    // otherwise every piece would flatten to the ground on each server push.
    const zById = new Map((map?.pieces ?? []).map((p) => [p.id, p.coord.z]));
    setLivePieces(
      s.pieces.map((p) => ({ ...p, coord: { ...p.coord, z: zById.get(p.id) ?? 0 } })),
    );
    setFog({ fogMode: s.fogMode, visiblePolygons: s.visiblePolygons });
  }, [map]);

  const handleVisibilityUpdated = useCallback(
    (polys: Array<Array<[number, number]>>) => {
      setFog((f) => ({ ...f, visiblePolygons: polys }));
    },
    [],
  );

  const handleWallRevealed = useCallback((wall: WallSegment) => {
    setLiveWalls((prev) => prev.map((w) => (w.id === wall.id ? wall : w)));
  }, []);

  // Board the master seeds the game server with. Derived from the REST map only —
  // using live WS state here would feed the server's own pushes back into a sync loop.
  const board = useMemo<MatchBoardSync | null>(
    () => (map ? { pieces: map.pieces ?? [], walls: map.walls ?? [], grid: map.grid } : null),
    [map],
  );

  const { sendMasterAction, sendAction } = useMatchWs({
    matchUuid: matchId,
    token,
    isMaster,
    onWallStateChanged: handleWallStateChanged,
    onWallHpChanged: handleWallHpChanged,
    onMapFullState: handleMapFullState,
    onVisibilityUpdated: handleVisibilityUpdated,
    onWallRevealed: handleWallRevealed,
    board,
  });

  const handleWallClick = useCallback(
    (wall: WallSegment) => {
      setWallPicker(wall);
    },
    [],
  );

  const npcMap = useMemo(() => {
    const m = new Map<string, CharacterPrivateSummary>();
    (campaign?.characterSheets ?? []).forEach((cs) => m.set(cs.uuid, cs));
    return m;
  }, [campaign]);

  const isLoading = matchMapPending || (!!matchMap && mapPending);

  const sidebar = (
    <ParticipantList>
      <SidebarTitle>Participantes</SidebarTitle>
      {participants.length === 0 ? (
        <EmptyParticipants>Nenhum participante.</EmptyParticipants>
      ) : (
        participants.map((p) => {
          const isMaster =
            !!match &&
            !!p.characterSheet.masterUuid &&
            p.characterSheet.masterUuid === match.masterUuid;
          return (
            <ParticipantRow key={p.uuid}>
              <ParticipantName>{p.characterSheet.nickName}</ParticipantName>
              {isMaster && <MasterBadge>Mestre</MasterBadge>}
            </ParticipantRow>
          );
        })
      )}
    </ParticipantList>
  );

  return (
    <>
      <GamePageTemplate sidebar={sidebar}>
        <CanvasWrapper ref={canvasRef}>
          {isLoading ? (
            <MapLoadingMessage>Carregando mapa...</MapLoadingMessage>
          ) : map && width > 0 && height > 0 ? (
            <TacticalMapViewer
              map={{ ...map, walls: liveWalls, pieces: livePieces ?? map.pieces }}
              fog={fog}
              isMaster={isMaster}
              width={width}
              height={height}
              npcMap={npcMap}
              onWallClick={handleWallClick}
            />
          ) : !map ? (
            <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
          ) : null}
        </CanvasWrapper>
      </GamePageTemplate>
      {wallPicker && (
        <WallActionOverlay onClick={() => setWallPicker(null)}>
          <WallActionMenu onClick={(e) => e.stopPropagation()}>
            {isMaster && <MasterActionBadge>Ação do Mestre</MasterActionBadge>}
            <WallActionTitle>
              {wallPicker.wallType === "door" ? "Porta"
                : wallPicker.wallType === "window" ? "Janela"
                : wallPicker.wallType === "terrain" ? "Terreno"
                : wallPicker.wallType === "secret_door" ? "P. Secreta"
                : "Parede"}
            </WallActionTitle>

            {/* Open/Close — master ignores locked; player is blocked when locked */}
            {(wallPicker.wallType === "door" || wallPicker.wallType === "window") && (
              isMaster ? (
                <WallActionButton onClick={() => {
                  sendMasterAction({
                    target_ids: [wallPicker.id],
                    interact: { kind: wallPicker.open ? "close" : "open" },
                  });
                  setWallPicker(null);
                }}>
                  {wallPicker.open ? "Fechar" : "Abrir"}
                </WallActionButton>
              ) : !wallPicker.locked ? (
                <WallActionButton onClick={() => {
                  sendAction({
                    target_id: [wallPicker.id],
                    interact: { kind: wallPicker.open ? "close" : "open" },
                  });
                  setWallPicker(null);
                }}>
                  {wallPicker.open ? "Fechar" : "Abrir"}
                </WallActionButton>
              ) : wallPicker.wallType === "door" ? (
                <WallActionButton onClick={() => {
                  sendAction({ target_id: [wallPicker.id], interact: { kind: "lockpick" } });
                  setWallPicker(null);
                }}>
                  Arrombar fechadura
                </WallActionButton>
              ) : null
            )}

            {/* Attack — available when destructible; terrain is scenery, not attackable */}
            {wallPicker.wallType !== "terrain" && wallPicker.maxHp > 0 && !wallPicker.destroyed && (
              isMaster ? (
                <WallActionButton onClick={() => {
                  sendMasterAction({
                    target_ids: [wallPicker.id],
                    attack: {
                      hit: { skill_name: "combat_strength" },
                      damage: { skill_name: "combat_strength" },
                    },
                  });
                  setWallPicker(null);
                }}>
                  Atacar
                </WallActionButton>
              ) : (
                <WallActionButton onClick={() => {
                  sendAction({
                    target_id: [wallPicker.id],
                    attack: {
                      hit: { skill_name: "combat_strength" },
                      damage: { skill_name: "combat_strength" },
                    },
                  });
                  setWallPicker(null);
                }}>
                  Atacar
                </WallActionButton>
              )
            )}

            <WallActionCancel onClick={() => setWallPicker(null)}>Cancelar</WallActionCancel>
          </WallActionMenu>
        </WallActionOverlay>
      )}
    </>
  );
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

const CanvasWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MapLoadingMessage = styled.p`
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 16px;
  text-align: center;
  padding: 24px;
`;

const NoMapMessage = styled.p`
  color: ${colors.textDisabled};
  font-family: ${fonts.sans};
  font-size: 16px;
  text-align: center;
  padding: 24px;
`;

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const ParticipantList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const SidebarTitle = styled.h2`
  font-family: ${fonts.display};
  font-size: 14px;
  letter-spacing: 1.5px;
  color: ${colors.textMuted};
  text-transform: uppercase;
  margin: 0 0 12px;
`;

const EmptyParticipants = styled.li`
  color: ${colors.textPlaceholderStrong};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const ParticipantRow = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid ${colors.grayMid};

  &:last-child {
    border-bottom: none;
  }
`;

const ParticipantName = styled.span`
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 14px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MasterBadge = styled.span`
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  text-transform: uppercase;
`;

const WallActionOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
`;

const WallActionMenu = styled.div`
    background: ${colors.surfaceSidebar};
    border: 1px solid ${colors.grayMid};
    border-radius: 8px;
    padding: 16px;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const MasterActionBadge = styled.span`
    font-family: ${fonts.sans};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${colors.brandAccent};
    background: rgba(255, 152, 0, 0.12);
    border: 1px solid ${colors.brandAccent};
    border-radius: 3px;
    padding: 2px 6px;
    align-self: flex-start;
`;

const WallActionTitle = styled.h3`
    font-family: ${fonts.display};
    font-size: 14px;
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 4px;
`;

const WallActionButton = styled.button`
    background: ${colors.brandPrimary};
    color: ${colors.textPrimary};
    font-family: ${fonts.sans};
    font-size: 14px;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    text-align: left;
    &:hover { opacity: 0.85; }
`;

const WallActionCancel = styled.button`
    background: transparent;
    color: ${colors.textMuted};
    font-family: ${fonts.sans};
    font-size: 13px;
    border: 1px solid ${colors.grayMid};
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    margin-top: 4px;
    &:hover { background: ${colors.grayMid}; }
`;
