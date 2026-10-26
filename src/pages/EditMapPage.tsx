import { useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import { useMap } from "../hooks/useMap";
import { useUpdateMap } from "../hooks/useUpdateMap";
import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import type { TacticalMap } from "../types/tacticalMap";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { isApiError } from "../services/httpClient";

export default function EditMapPage() {
  const { campaignId, mapId } = useParams<{
    campaignId: string;
    mapId: string;
  }>();
  const { token } = useToken();

  const { data: map, isPending, isError, error, refetch } = useMap(token, mapId);
  const { mutateAsync } = useUpdateMap(token, campaignId, mapId);

  const handleSave = useCallback(async (updatedMap: TacticalMap): Promise<void> => {
    await mutateAsync({
      name: updatedMap.name.trim(),
      description: updatedMap.description,
      grid: updatedMap.grid,
      bg: updatedMap.bg,
      pieces: updatedMap.pieces,
      walls: updatedMap.walls,
    });
  }, [mutateAsync]);

  useDocumentTitle("Editar", map?.name);

  if (!token) return <Navigate to="/" replace />;

  const campaignBack = { label: "Voltar para a campanha", to: `/campaigns/${campaignId}` };
  if (isError) {
    return isApiError(error, 404) ? (
      <PageNotFound title="Mapa não encontrado" back={campaignBack} />
    ) : (
      <PageError
        title="Não foi possível carregar o mapa"
        onRetry={() => void refetch()}
        back={campaignBack}
      />
    );
  }
  if (isPending) return <PageLoading label="Carregando mapa…" />;
  if (!map) return <PageNotFound title="Mapa não encontrado" back={campaignBack} />;

  return (
    <TacticalMapEditor
      campaignId={campaignId ?? ""}
      initialMap={map}
      onSave={handleSave}
    />
  );
}
