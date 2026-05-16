import { useState } from "react";
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
  const { data: charClasses, isLoading, error } = useCharacterClasses(token);

  const sheetMode: SheetMode = {
    headerMode: "create",
    profileMode: "create",
    diagramsMode: "create",
    proficiencyMode: "view",
    skillsMode: "view",
  };

  const handleAvatarSelected = (blob: Blob | null, url: string | null) => {
    setAvatarBlob(blob);
    const previewUrl = blob ? URL.createObjectURL(blob) : url ?? undefined;
    setCharSheet((prev) => ({
      ...prev,
      profile: { ...prev.profile, avatar: previewUrl },
    }));
  };

  const handleCoverSelected = (blob: Blob | null, url: string | null) => {
    setCoverBlob(blob);
    const previewUrl = blob ? URL.createObjectURL(blob) : url ?? undefined;
    setCharSheet((prev) => ({
      ...prev,
      profile: { ...prev.profile, cover: previewUrl },
    }));
  };

  const handleCreateSheet = async () => {
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Step 1: create the sheet
      const { uuid } = await characterSheetsService.createCharacterSheet(token, charSheet);

      // Step 2: upload images to R2 (if blobs present)
      let avatarUrl = avatarBlob ? undefined : charSheet.profile.avatar;
      let coverUrl = coverBlob ? undefined : charSheet.profile.cover;

      if (avatarBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "avatar", uuid);
        await uploadService.uploadToR2(uploadUrl, avatarBlob);
        avatarUrl = publicUrl;
      }

      if (coverBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "cover", uuid);
        await uploadService.uploadToR2(uploadUrl, coverBlob);
        coverUrl = publicUrl;
      }

      // Step 3: persist URLs on profile (only if there's something to save)
      if (avatarUrl !== undefined || coverUrl !== undefined) {
        await characterSheetsService.patchCharacterSheetProfile(
          token,
          uuid,
          avatarUrl ?? null,
          coverUrl ?? null,
        );
      }

      navigate(`/charactersheets/${uuid}`);
    } catch (err) {
      console.error("Falha ao criar ficha:", err);
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
