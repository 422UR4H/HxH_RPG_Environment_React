import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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

function CreateCharacterSheetPage() {
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
  // Sobrevive a um retry: depois de criada, a ficha nunca é recriada — um
  // clique seguinte só reenvia upload/patch contra este mesmo uuid.
  const createdUuidRef = useRef<string | undefined>(undefined);
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

  const handleCreateSheet = async () => {
    if (!token || isSubmitting) return;

    const validationError = validateCharacterSheet(charSheet, charClasses, "create");
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      let uuid = createdUuidRef.current;
      if (!uuid) {
        const selectedClass = charClasses?.find(
          (cc) => cc.profile.name === charSheet.characterClass
        );
        const created = await characterSheetsService.createCharacterSheet(token, charSheet, selectedClass);
        uuid = created.uuid;
        createdUuidRef.current = uuid;
      }

      let resolvedAvatarUrl = avatarBlob ? undefined : charSheet.profile.avatarUrl;
      let resolvedCoverUrl = coverBlob ? undefined : charSheet.profile.coverUrl;

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
          resolvedAvatarUrl,
          resolvedCoverUrl,
          charSheet.profile.briefDescription ?? null,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["characterSheets", token] });
      navigate(`/charactersheet/${uuid}`, { replace: true });
    } catch (_) {
      // Se a ficha já foi criada (uuid gravado), um novo clique em "Criar Ficha"
      // não cria outra — só reenvia upload/patch contra o mesmo uuid.
      setSubmitError(
        createdUuidRef.current
          ? "A ficha foi criada, mas a imagem não foi enviada. Tentar de novo envia só a imagem."
          : "Erro ao salvar a ficha. Tente novamente."
      );
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
        submitError,
      }}
    />
  );
}

export default CreateCharacterSheetPage;
