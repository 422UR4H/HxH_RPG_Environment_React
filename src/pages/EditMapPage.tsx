import { Navigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import { useMap } from "../hooks/useMap";
import { useUpdateMap } from "../hooks/useUpdateMap";
import { LoadingContainer } from "../components/atoms/PageStates";
import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import type { TacticalMap } from "../types/tacticalMap";

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
    return <LoadingContainer>Carregando mapa...</LoadingContainer>;

  const handleSave = async (updatedMap: TacticalMap): Promise<void> => {
    await mutateAsync({
      name: updatedMap.name.trim(),
      description: updatedMap.description,
      grid: updatedMap.grid,
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
