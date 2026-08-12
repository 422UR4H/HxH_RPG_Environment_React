// src/features/match/MatchMapsPanel.tsx
import styled from "styled-components";
import type { TacticalMap, MatchMapResponse } from "../../types/tacticalMap";
import MapCard from "../../components/molecules/MapCard";
import { colors, fonts } from "../../styles/tokens";

interface MatchMapsPanelProps {
  activeTab: string;
  isMaster: boolean;
  matchEnded: boolean;
  matchStarted: boolean;
  mapsPending: boolean;
  maps: TacticalMap[] | undefined;
  matchMap: MatchMapResponse | null | undefined;
  isAttaching: boolean;
  isDetaching: boolean;
  onMapClick: (mapId: string) => void;
  onAttach: (mapId: string) => void;
  onDetach: () => void;
}

export default function MatchMapsPanel({
  activeTab,
  isMaster,
  matchEnded,
  matchStarted,
  mapsPending,
  maps,
  matchMap,
  isAttaching,
  isDetaching,
  onMapClick,
  onAttach,
  onDetach,
}: MatchMapsPanelProps) {
  if (activeTab !== "maps") return null;

  if (isMaster) {
    return (
      <MapsGrid>
        {mapsPending ? (
          <MapsEmptyText>Carregando mapas...</MapsEmptyText>
        ) : (maps ?? []).length === 0 ? (
          <MapsEmptyText>Nenhum mapa criado ainda.</MapsEmptyText>
        ) : (
          (maps ?? []).map((map) => {
            const isAttached = matchMap?.mapUuid === map.id;
            return (
              <MapCardWrapper key={map.id}>
                <MapCard map={map} onClick={() => onMapClick(map.id)} />
                {!matchStarted && (
                  <MapAttachRow>
                    {isAttached ? (
                      <>
                        <AttachedBadge>Anexado</AttachedBadge>
                        <DetachButton onClick={onDetach} disabled={isDetaching}>
                          {isDetaching ? "Desanexando..." : "Desanexar"}
                        </DetachButton>
                      </>
                    ) : (
                      <AttachButton
                        onClick={() => onAttach(map.id)}
                        disabled={isAttaching}
                      >
                        {isAttaching ? "Anexando..." : "Anexar"}
                      </AttachButton>
                    )}
                  </MapAttachRow>
                )}
              </MapCardWrapper>
            );
          })
        )}
      </MapsGrid>
    );
  }

  if (matchEnded) {
    return (
      <MapsPlaceholder>
        Os mapas jogados nesta partida estarão disponíveis em breve.
      </MapsPlaceholder>
    );
  }

  return null;
}

const MapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 112px;
`;

const MapsEmptyText = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 20px 0;
`;

const MapsPlaceholder = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 40px 0;
  text-align: center;
`;

const MapCardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MapAttachRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AttachedBadge = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 10px;
  border-radius: 20px;
  background-color: ${colors.statusOngoing};
  color: ${colors.textPrimary};
`;

const BaseMapButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:not(:disabled):hover {
    filter: brightness(1.1);
  }
  &:not(:disabled):active {
    transform: scale(0.98);
  }
`;

const AttachButton = styled(BaseMapButton)`
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
`;

const DetachButton = styled(BaseMapButton)`
  background-color: transparent;
  border: 1px solid ${colors.borderDivider};
  color: ${colors.textMuted};
`;
