import { Navigate, useParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import useToken from "../hooks/useToken";
import { useMap } from "../hooks/useMap";
import { useUpdateMap } from "../hooks/useUpdateMap";
import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import type { TacticalMap } from "../types/tacticalMap";
import { colors, fonts } from "../styles/tokens";

export default function EditMapPage() {
  const { campaignId, mapId } = useParams<{
    campaignId: string;
    mapId: string;
  }>();
  const { token } = useToken();

  const { data: map, isLoading } = useMap(token, mapId);
  const { mutateAsync } = useUpdateMap(token, campaignId, mapId);

  if (!token) return <Navigate to="/" replace />;

  if (isLoading || !map)
    return (
      <MapLoadingScreen>
        <MapSpinner />
        <MapLoadingText>Carregando mapa...</MapLoadingText>
      </MapLoadingScreen>
    );

  const handleSave = async (updatedMap: TacticalMap): Promise<void> => {
    await mutateAsync({
      name: updatedMap.name.trim(),
      description: updatedMap.description,
      grid: updatedMap.grid,
      bg: updatedMap.bg,
      pieces: updatedMap.pieces,
    });
  };

  return (
    <TacticalMapEditor
      campaignId={campaignId ?? ""}
      initialMap={map}
      onSave={handleSave}
    />
  );
}

const spinMap = keyframes`
  to { transform: rotate(360deg); }
`;

const MapLoadingScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 100dvh;
  background: ${colors.surfaceSidebar};
`;

const MapSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.12);
  border-top-color: ${colors.brandAccent};
  border-radius: 50%;
  animation: ${spinMap} 0.9s linear infinite;
`;

const MapLoadingText = styled.p`
  margin: 0;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 16px;
`;
