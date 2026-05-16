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

  const validateCharSheet = (): string | null => {
    const errors: string[] = [];
    const { profile, characterClass, abilities, physicalAttributes, mentalAttributes } = charSheet;

    if (!characterClass) errors.push("Selecione uma classe para o personagem.");

    const nick = profile.nickname.trim();
    if (nick.length < 3 || nick.length > 10)
      errors.push("Nickname deve ter entre 3 e 10 caracteres.");

    const full = profile.fullname.trim();
    if (full.length < 6 || full.length > 32)
      errors.push("Nome completo deve ter entre 6 e 32 caracteres.");

    if ((profile.briefDescription ?? "").length > 255)
      errors.push("Descrição breve deve ter no máximo 255 caracteres.");

    if (profile.age < 0)
      errors.push("Idade não pode ser negativa.");

    const physicalsBudget = abilities["physicals"]?.level ?? 0;
    const physicalsSpent = Object.values(physicalAttributes).reduce(
      (sum, attr) => sum + (attr.points || 0), 0
    );
    if (physicalsBudget - physicalsSpent > 0)
      errors.push("Distribua todos os pontos de atributos físicos antes de criar a ficha.");

    const mentalsBudget = abilities["mentals"]?.level ?? 0;
    const mentalsSpent = Object.values(mentalAttributes).reduce(
      (sum, attr) => sum + (attr.points || 0), 0
    );
    if (mentalsBudget - mentalsSpent > 0)
      errors.push("Distribua todos os pontos de atributos mentais antes de criar a ficha.");

    return errors.length > 0 ? errors.join("\n") : null;
  };

  const handleCreateSheet = async () => {
    if (!token || isSubmitting) return;

    const validationError = validateCharSheet();
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
      if (createdUuid && (resolvedAvatarUrl !== undefined || resolvedCoverUrl !== undefined)) {
        characterSheetsService.patchCharacterSheetProfile(
          token,
          createdUuid,
          resolvedAvatarUrl ?? null,
          resolvedCoverUrl ?? null,
        ).catch(() => undefined);
      }
      setSubmitError("Erro ao salvar a ficha. Tente novamente.");
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
