import { useCallback, useMemo } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import { useCreateMap } from "../hooks/useCreateMap";
import TacticalMapEditor from "../features/tactical-map/TacticalMapEditor";
import { DEFAULT_MAP_FIELDS } from "../features/tactical-map/defaultMap";
import type { TacticalMap } from "../types/tacticalMap";

export default function CreateMapPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { token } = useToken();
  const { mutateAsync } = useCreateMap(token, campaignId);

  const initialMap = useMemo<TacticalMap>(
    () => ({
      ...DEFAULT_MAP_FIELDS,
      id: crypto.randomUUID(),
      campaignId: campaignId ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSave = useCallback(async (map: TacticalMap) => {
    await mutateAsync({
      name: map.name.trim(),
      description: map.description?.trim() || undefined,
      grid: map.grid,
      bg: map.bg,
      pieces: map.pieces,
    });
  }, [mutateAsync]);

  const handleSaveSuccess = useCallback(
    () => navigate(`/campaigns/${campaignId}`),
    [navigate, campaignId],
  );

  useDocumentTitle("Novo mapa");

  if (!token) return <Navigate to="/" replace />;

  return (
    <TacticalMapEditor
      campaignId={campaignId ?? ""}
      initialMap={initialMap}
      onSave={handleSave}
      onSaveSuccess={handleSaveSuccess}
      saveLabel="Criar Mapa"
    />
  );
}
