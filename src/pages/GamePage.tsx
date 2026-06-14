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
import useUser from "../hooks/useUser";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import GamePageTemplate from "../components/templates/GamePageTemplate";
import { colors, fonts } from "../styles/tokens";
import type { CharacterPrivateSummary } from "../types/characterSheet";
import type { WallSegment } from "../types/tacticalMap";

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

  // Sync liveWalls when the REST map loads.
  useEffect(() => {
    if (map) setLiveWalls(map.walls ?? []);
  }, [map]);

  // Determine if current user is the master.
  const isMaster = match != null && user != null && match.masterUuid === user.uuid;

  const handleWallStateChanged = useCallback((wallId: string, open: boolean, locked: boolean) => {
    setLiveWalls((prev) =>
      prev.map((w) => (w.id === wallId ? { ...w, open, locked } : w)),
    );
  }, []);

  const { sendMasterAction, sendAction } = useMatchWs({
    matchUuid: matchId,
    token,
    isMaster,
    onWallStateChanged: handleWallStateChanged,
    walls: liveWalls,
    cellSize: map?.grid?.cellSize,
  });

  const handleDoorClick = useCallback(
    (wallId: string) => {
      const wall = liveWalls.find((w) => w.id === wallId);
      if (!wall) return;
      if (isMaster) {
        sendMasterAction({ target_ids: [wallId], interact: { kind: "toggle" } });
      } else {
        const intent = wall.open ? "close" : "open";
        sendAction({ target_id: [wallId], interact: { kind: intent } });
      }
    },
    [liveWalls, isMaster, sendMasterAction, sendAction],
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
    <GamePageTemplate sidebar={sidebar}>
      {/* CanvasWrapper is always mounted so useResizeObserver starts observing
          immediately. Conditional rendering here would cause the ref to attach
          late, after the observer effect has already run, so the observer would
          never start and width/height would stay at 0. */}
      <CanvasWrapper ref={canvasRef}>
        {isLoading ? (
          <MapLoadingMessage>Carregando mapa...</MapLoadingMessage>
        ) : map && width > 0 && height > 0 ? (
          <TacticalMapViewer
            map={{ ...map, walls: liveWalls }}
            width={width}
            height={height}
            npcMap={npcMap}
            onDoorClick={handleDoorClick}
          />
        ) : !map ? (
          <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
        ) : null}
      </CanvasWrapper>
    </GamePageTemplate>
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
