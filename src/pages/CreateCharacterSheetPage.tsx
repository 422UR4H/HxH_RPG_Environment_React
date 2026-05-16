import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import { useCharacterClasses } from "../hooks/useCharacterClasses";
import type { CharacterSheet } from "../types/characterSheet";
import { createEmptyCharacterSheet } from "../features/sheet/factories/characterSheet.factory";
import { characterSheetsService } from "../services/characterSheetsService";
import { uploadService } from "../services/uploadService";

function CreateCharacterSheetPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [charSheet, setCharSheet] = useState<CharacterSheet>(createEmptyCharacterSheet());
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    proficiencyMode: "view",
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
    setCharSheet((prev) => ({ ...prev, profile: { ...prev.profile, avatar: previewUrl } }));
  };

  const handleCoverSelected = (blob: Blob | null, url: string | null) => {
    setCoverBlob(blob);
    if (coverBlobUrlRef.current) {
      URL.revokeObjectURL(coverBlobUrlRef.current);
      coverBlobUrlRef.current = undefined;
    }
    const previewUrl = blob ? URL.createObjectURL(blob) : url ?? undefined;
    if (blob && previewUrl) coverBlobUrlRef.current = previewUrl;
    setCharSheet((prev) => ({ ...prev, profile: { ...prev.profile, cover: previewUrl } }));
  };

  const handleCreateSheet = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    let createdUuid: string | undefined;
    let resolvedAvatarUrl: string | undefined;
    let resolvedCoverUrl: string | undefined;
    try {
      const { uuid } = await characterSheetsService.createCharacterSheet(token, charSheet);
      createdUuid = uuid;

      resolvedAvatarUrl = avatarBlob ? undefined : charSheet.profile.avatar;
      resolvedCoverUrl = coverBlob ? undefined : charSheet.profile.cover;

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

      navigate(`/charactersheets/${uuid}`);
    } catch (err) {
      console.error("Falha ao criar ficha:", err);
      // Best-effort: persist any URLs already uploaded before the failure
      if (createdUuid && (resolvedAvatarUrl !== undefined || resolvedCoverUrl !== undefined)) {
        characterSheetsService.patchCharacterSheetProfile(
          token,
          createdUuid,
          resolvedAvatarUrl ?? null,
          resolvedCoverUrl ?? null,
        ).catch(() => undefined);
      }
      // TODO: exibir erro ao usuário (toast ou mensagem inline)
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return <Navigate to="/" replace />;

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
        onCreateSheet: handleCreateSheet,
      }}
    />
  );
}

export default CreateCharacterSheetPage;
