import { useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import { useMatchMap } from "../hooks/useMatchMap";
import { useMap } from "../hooks/useMap";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useMatchParticipants } from "../hooks/useMatchParticipants";
import { useResizeObserver } from "../hooks/useResizeObserver";
import TacticalMapViewer from "../features/tactical-map/TacticalMapViewer";
import GamePageTemplate from "../components/templates/GamePageTemplate";
import { LoadingContainer } from "../components/atoms/PageStates";
import { colors, fonts } from "../styles/tokens";

export default function GamePage() {
  const { token } = useToken();
  const { matchId } = useParams<{ campaignId: string; matchId: string }>();

  if (!token) return <Navigate to="/" replace />;

  return <GamePageInner token={token} matchId={matchId} />;
}

// ─── Inner (token is guaranteed) ────────────────────────────────────────────

function GamePageInner({ token, matchId }: { token: string; matchId?: string }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(canvasRef);

  const { data: matchMap, isPending: matchMapPending } = useMatchMap(token, matchId);
  const { data: map, isPending: mapPending } = useMap(
    token,
    matchMap?.mapUuid,
  );
  const { data: match } = useMatchDetails(token, matchId);
  const { data: participants = [] } = useMatchParticipants(token, matchId, true);

  const isLoading = matchMapPending || (!!matchMap && mapPending);

  if (isLoading) {
    return <LoadingContainer>Carregando mapa...</LoadingContainer>;
  }

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
      <CanvasWrapper ref={canvasRef}>
        {map ? (
          <TacticalMapViewer map={map} width={width} height={height} />
        ) : (
          <NoMapMessage>Nenhum mapa anexado a esta partida.</NoMapMessage>
        )}
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
