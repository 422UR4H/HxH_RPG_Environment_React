// src/features/match/MatchMapsPanel.tsx
import styled from "styled-components";
import type { TacticalMap, MatchMapResponse } from "../../types/tacticalMap";
import MapCard from "../../components/molecules/MapCard";
import { colors, fonts } from "../../styles/tokens";
import { formatDateBR } from "../../utils/date";
import type { BoardSource } from "../../hooks/useInheritableBoards";

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
  /** Por que a última troca de mapa falhou (texto já pronto, da página). */
  changeError?: string | null;
  /** O que a última troca de mapa fez, quando vale dizer (texto já pronto, da página). */
  changeNotice?: string | null;
  /** Por mapa, as partidas de onde esta pode continuar o tabuleiro (F15). */
  boardSources: Record<string, BoardSource[]>;
  onMapClick: (mapId: string) => void;
  onAttach: (mapId: string) => void;
  onDetach: () => void;
  onInherit: (mapId: string, sourceMatchUuid: string) => void;
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
  changeError,
  changeNotice,
  boardSources,
  onMapClick,
  onAttach,
  onDetach,
  onInherit,
}: MatchMapsPanelProps) {
  if (activeTab !== "maps") return null;

  if (isMaster) {
    return (
      <MapsGrid>
        {changeError && <MapChangeError role="alert">{changeError}</MapChangeError>}
        {changeNotice && <MapChangeNotice role="status">{changeNotice}</MapChangeNotice>}
        {mapsPending ? (
          <MapsEmptyText>Carregando mapas...</MapsEmptyText>
        ) : (maps ?? []).length === 0 ? (
          <MapsEmptyText>Nenhum mapa criado ainda.</MapsEmptyText>
        ) : (
          (maps ?? []).map((map) => {
            const isAttached = matchMap?.mapUuid === map.id;
            const sources = boardSources[map.id] ?? [];
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
                {!matchStarted && sources.length > 0 && (
                  <InheritBlock>
                    <InheritLabel>Continuar o tabuleiro de…</InheritLabel>
                    <InheritList>
                      {sources.map((s) => (
                        <InheritButton
                          key={s.matchUuid}
                          onClick={() => onInherit(map.id, s.matchUuid)}
                          disabled={isAttaching}
                        >
                          {`${s.title} · ${formatDateBR(s.startedAt)}`}
                        </InheritButton>
                      ))}
                    </InheritList>
                    {/* Contrato B16: a sala do lobby aberta guarda o tabuleiro antigo em memória e
                        o próximo salvamento dela sobrescreve o herdado. */}
                    <InheritHint>
                      Faça isso com o lobby fechado: com ele aberto, a próxima peça movida lá
                      desfaz a continuação.
                    </InheritHint>
                  </InheritBlock>
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

const MapChangeError = styled.p`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.danger};
`;

const MapChangeNotice = styled.p`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.textMuted};
`;

const InheritBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InheritLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textMuted};
`;

const InheritList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const InheritHint = styled.p`
  font-family: ${fonts.sans};
  font-size: 12px;
  color: ${colors.textMuted};
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

const InheritButton = styled(BaseMapButton)`
  background-color: transparent;
  border: 1px solid ${colors.brandAccent};
  color: ${colors.textPrimary};
`;

const DetachButton = styled(BaseMapButton)`
  background-color: transparent;
  border: 1px solid ${colors.borderDivider};
  color: ${colors.textMuted};
`;
