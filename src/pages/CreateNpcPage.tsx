import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import useToken from "../hooks/useToken";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import { useCharacterClasses } from "../hooks/useCharacterClasses";
import type { CharacterSheet } from "../types/characterSheet";
import { createEmptyCharacterSheet } from "../features/sheet/factories/characterSheet.factory";
import { validateCharacterSheet } from "../features/sheet/utils/validateCharacterSheet";
import { characterSheetsService } from "../services/characterSheetsService";
import { uploadService } from "../services/uploadService";

function CreateNpcPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [charSheet, setCharSheet] = useState<CharacterSheet>(createEmptyCharacterSheet());
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const avatarBlobUrlRef = useRef<string | undefined>(undefined);
  const coverBlobUrlRef = useRef<string | undefined>(undefined);
  const { data: charClasses, isLoading, error } = useCharacterClasses(token);

  useEffect(() => {
    return () => {
      if (avatarBlobUrlRef.current) URL.revokeObjectURL(avatarBlobUrlRef.current);
      if (coverBlobUrlRef.current) URL.revokeObjectURL(coverBlobUrlRef.current);
    };
  }, []);

  const sheetMode: SheetMode = {
    headerMode: "create",
    profileMode: "create",
    diagramsMode: "create",
    proficiencyMode: "create",
    skillsMode: "view",
  };

  const handleAvatarSelected = (blob: Blob | null, url: string | null) => {
    setAvatarBlob(blob);
    if (avatarBlobUrlRef.current) {
      URL.revokeObjectURL(avatarBlobUrlRef.current);
      avatarBlobUrlRef.current = undefined;
    }
    const previewUrl = blob ? URL.createObjectURL(blob) : url ?? undefined;
    if (blob && previewUrl) avatarBlobUrlRef.current = previewUrl;
    setCharSheet((prev) => ({ ...prev, profile: { ...prev.profile, avatarUrl: previewUrl } }));
  };

  const handleCoverSelected = (blob: Blob | null, url: string | null) => {
    setCoverBlob(blob);
    if (coverBlobUrlRef.current) {
      URL.revokeObjectURL(coverBlobUrlRef.current);
      coverBlobUrlRef.current = undefined;
    }
    const previewUrl = blob ? URL.createObjectURL(blob) : url ?? undefined;
    if (blob && previewUrl) coverBlobUrlRef.current = previewUrl;
    setCharSheet((prev) => ({ ...prev, profile: { ...prev.profile, coverUrl: previewUrl } }));
  };

  const handleCreateNpc = async () => {
    if (!token || !campaignId || isSubmitting) return;

    const validationError = validateCharacterSheet(charSheet, charClasses, "create");
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    let createdUuid: string | undefined;
    let resolvedAvatarUrl: string | undefined;
    let resolvedCoverUrl: string | undefined;
    try {
      const selectedClass = charClasses?.find(
        (cc) => cc.profile.name === charSheet.characterClass
      );
      const { uuid } = await characterSheetsService.createCharacterSheet(
        token,
        charSheet,
        selectedClass,
        campaignId
      );
      createdUuid = uuid;

      resolvedAvatarUrl = avatarBlob ? undefined : charSheet.profile.avatarUrl;
      resolvedCoverUrl = coverBlob ? undefined : charSheet.profile.coverUrl;

      if (avatarBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "avatar", uuid);
        await uploadService.uploadToR2(uploadUrl, avatarBlob);
        resolvedAvatarUrl = publicUrl;
      }

      if (coverBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "cover", uuid);
        await uploadService.uploadToR2(uploadUrl, coverBlob);
        resolvedCoverUrl = publicUrl;
      }

      if (resolvedAvatarUrl !== undefined || resolvedCoverUrl !== undefined) {
        await characterSheetsService.patchCharacterSheetProfile(
          token,
          uuid,
          resolvedAvatarUrl ?? null,
          resolvedCoverUrl ?? null,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["campaignDetails", token, campaignId] });
      navigate(`/campaigns/${campaignId}`, { replace: true });
    } catch (err) {
      console.error("Falha ao criar NPC:", err);
      if (createdUuid && (resolvedAvatarUrl !== undefined || resolvedCoverUrl !== undefined)) {
        characterSheetsService.patchCharacterSheetProfile(
          token,
          createdUuid,
          resolvedAvatarUrl ?? null,
          resolvedCoverUrl ?? null,
        ).catch(() => undefined);
      }
      setSubmitError("Erro ao salvar o NPC. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return <Navigate to="/" replace />;
  if (!campaignId) return <Navigate to="/campaigns" replace />;

  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{
        charSheet,
        setCharSheet,
        charClasses,
        isLoading: isLoading || isSubmitting,
        error: error ? error.message : null,
        onAvatarSelected: handleAvatarSelected,
        onCoverSelected: handleCoverSelected,
        onCreateSheet: handleCreateNpc,
        submitLabel: "Criar NPC",
        submitError,
      }}
    />
  );
}

export default CreateNpcPage;
