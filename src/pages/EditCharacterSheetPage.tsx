import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import { useCharacterClasses } from "../hooks/useCharacterClasses";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import type { CharacterSheet } from "../types/characterSheet";
import { characterSheetsService } from "../services/characterSheetsService";
import { uploadService } from "../services/uploadService";

function EditCharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existingSheet, isLoading: sheetLoading } = useCharacterSheet(token, id);
  const { data: charClasses, isLoading: classesLoading, error: classesError } = useCharacterClasses(token);

  const [charSheet, setCharSheet] = useState<CharacterSheet | undefined>(undefined);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const avatarBlobUrlRef = useRef<string | undefined>(undefined);
  const coverBlobUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (existingSheet) setCharSheet(existingSheet);
  }, [existingSheet]);

  useEffect(() => {
    return () => {
      if (avatarBlobUrlRef.current) URL.revokeObjectURL(avatarBlobUrlRef.current);
      if (coverBlobUrlRef.current) URL.revokeObjectURL(coverBlobUrlRef.current);
    };
  }, []);

  if (!token || !id) return <Navigate to="/" replace />;

  if (existingSheet && user) {
    const isOwner = existingSheet.playerUuid === user.uuid;
    const isFree = !existingSheet.campaignUuid && !existingSheet.submission;
    if (!isOwner || !isFree) return <Navigate to={`/charactersheet/${id}`} replace />;
  }

  const sheetMode: SheetMode = {
    headerMode: "edit",
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
    setCharSheet((prev) => prev ? { ...prev, profile: { ...prev.profile, avatarUrl: previewUrl } } : prev);
  };

  const handleCoverSelected = (blob: Blob | null, url: string | null) => {
    setCoverBlob(blob);
    if (coverBlobUrlRef.current) {
      URL.revokeObjectURL(coverBlobUrlRef.current);
      coverBlobUrlRef.current = undefined;
    }
    const previewUrl = blob ? URL.createObjectURL(blob) : url ?? undefined;
    if (blob && previewUrl) coverBlobUrlRef.current = previewUrl;
    setCharSheet((prev) => prev ? { ...prev, profile: { ...prev.profile, coverUrl: previewUrl } } : prev);
  };

  const handleSave = async () => {
    if (!token || !id || !charSheet || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    let resolvedAvatarUrl: string | undefined = avatarBlob ? undefined : charSheet.profile.avatarUrl;
    let resolvedCoverUrl: string | undefined = coverBlob ? undefined : charSheet.profile.coverUrl;
    try {
      const selectedClass = charClasses?.find((cc) => cc.profile.name === charSheet.characterClass);
      await characterSheetsService.updateCharacterSheet(token, id, charSheet, selectedClass);

      if (avatarBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "avatar", id);
        await uploadService.uploadToR2(uploadUrl, avatarBlob);
        resolvedAvatarUrl = publicUrl;
      }
      if (coverBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "cover", id);
        await uploadService.uploadToR2(uploadUrl, coverBlob);
        resolvedCoverUrl = publicUrl;
      }
      if (resolvedAvatarUrl !== undefined || resolvedCoverUrl !== undefined) {
        await characterSheetsService.patchCharacterSheetProfile(
          token,
          id,
          resolvedAvatarUrl ?? null,
          resolvedCoverUrl ?? null,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["characterSheet", token, id] });
      navigate(`/charactersheet/${id}`, { replace: true });
    } catch {
      setSubmitError("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!charSheet) return null;

  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{
        charSheet,
        setCharSheet,
        charClasses,
        isLoading: sheetLoading || classesLoading || isSubmitting,
        error: classesError ? classesError.message : null,
        onAvatarSelected: handleAvatarSelected,
        onCoverSelected: handleCoverSelected,
        onCreateSheet: handleSave,
        submitError,
      }}
    />
  );
}

export default EditCharacterSheetPage;
