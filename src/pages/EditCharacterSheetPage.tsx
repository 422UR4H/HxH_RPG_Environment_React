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
import { validateCharacterSheet } from "../features/sheet/utils/validateCharacterSheet";
import { characterSheetsService } from "../services/characterSheetsService";
import { uploadService } from "../services/uploadService";

function sheetChangedFrom(
  current: CharacterSheet,
  original: CharacterSheet,
): boolean {
  const snap = (s: CharacterSheet) =>
    JSON.stringify({
      characterClass: s.characterClass,
      abilities: s.abilities,
      physicalAttributes: s.physicalAttributes,
      mentalAttributes: s.mentalAttributes,
      spiritualAttributes: s.spiritualAttributes,
      physicalSkills: s.physicalSkills,
      spiritualSkills: s.spiritualSkills,
      principles: s.principles,
      commonProficiencies: s.commonProficiencies,
      jointProficiencies: s.jointProficiencies,
      profile: {
        nickname: s.profile.nickname,
        fullname: s.profile.fullname,
        alignment: s.profile.alignment,
        birthday: s.profile.birthday,
        age: s.profile.age,
        briefDescription: s.profile.briefDescription,
        description: s.profile.description,
      },
    });
  return snap(current) !== snap(original);
}

function EditCharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existingSheet, isLoading: sheetLoading } = useCharacterSheet(
    token,
    id,
  );
  const {
    data: charClasses,
    isLoading: classesLoading,
    error: classesError,
  } = useCharacterClasses(token);

  const [charSheet, setCharSheet] = useState<CharacterSheet | undefined>(
    undefined,
  );
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
      if (avatarBlobUrlRef.current)
        URL.revokeObjectURL(avatarBlobUrlRef.current);
      if (coverBlobUrlRef.current) URL.revokeObjectURL(coverBlobUrlRef.current);
    };
  }, []);

  if (!token || !id) return <Navigate to="/" replace />;

  const isOwner = existingSheet
    ? existingSheet.playerUuid === user?.uuid
    : undefined;
  const isFree = existingSheet
    ? !existingSheet.campaignUuid && !existingSheet.submission
    : undefined;

  // Redirect non-owners; owners of non-free sheets stay and get profile-only mode
  if (existingSheet && user && !isOwner) {
    return <Navigate to={`/charactersheet/${id}`} replace />;
  }

  const editMode: "full" | "profile" = isFree === false ? "profile" : "full";

  const sheetMode: SheetMode =
    editMode === "full"
      ? {
          headerMode: "create",
          profileMode: "create",
          diagramsMode: "create",
          proficiencyMode: "create",
          skillsMode: "view",
        }
      : {
          headerMode: "edit-profile",
          profileMode: "edit",
          diagramsMode: "view",
          proficiencyMode: "view",
          skillsMode: "view",
        };

  const handleAvatarSelected = (blob: Blob | null, url: string | null) => {
    setAvatarBlob(blob);
    if (avatarBlobUrlRef.current) {
      URL.revokeObjectURL(avatarBlobUrlRef.current);
      avatarBlobUrlRef.current = undefined;
    }
    const previewUrl = blob ? URL.createObjectURL(blob) : (url ?? undefined);
    if (blob && previewUrl) avatarBlobUrlRef.current = previewUrl;
    setCharSheet((prev) =>
      prev
        ? { ...prev, profile: { ...prev.profile, avatarUrl: previewUrl } }
        : prev,
    );
  };

  const handleCoverSelected = (blob: Blob | null, url: string | null) => {
    setCoverBlob(blob);
    if (coverBlobUrlRef.current) {
      URL.revokeObjectURL(coverBlobUrlRef.current);
      coverBlobUrlRef.current = undefined;
    }
    const previewUrl = blob ? URL.createObjectURL(blob) : (url ?? undefined);
    if (blob && previewUrl) coverBlobUrlRef.current = previewUrl;
    setCharSheet((prev) =>
      prev
        ? { ...prev, profile: { ...prev.profile, coverUrl: previewUrl } }
        : prev,
    );
  };

  const handleSave = async () => {
    if (!token || !id || !charSheet || isSubmitting) return;

    if (editMode === "full") {
      const validationError = validateCharacterSheet(
        charSheet,
        charClasses,
        "edit",
      );
      if (validationError) {
        setSubmitError(validationError);
        return;
      }
      if (
        !avatarBlob &&
        !coverBlob &&
        existingSheet &&
        !sheetChangedFrom(charSheet, existingSheet)
      ) {
        navigate(`/charactersheet/${id}`, { replace: true });
        return;
      }
      setSubmitError(null);
      setIsSubmitting(true);
      let resolvedAvatarUrl: string | undefined = avatarBlob
        ? undefined
        : charSheet.profile.avatarUrl;
      let resolvedCoverUrl: string | undefined = coverBlob
        ? undefined
        : charSheet.profile.coverUrl;
      try {
        const selectedClass = charClasses?.find(
          (cc) => cc.profile.name === charSheet.characterClass,
        );
        await characterSheetsService.updateCharacterSheet(
          token,
          id,
          charSheet,
          selectedClass,
        );
        if (avatarBlob) {
          const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(
            token,
            "avatar",
            id,
          );
          await uploadService.uploadToR2(uploadUrl, avatarBlob);
          resolvedAvatarUrl = publicUrl;
        }
        if (coverBlob) {
          const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(
            token,
            "cover",
            id,
          );
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
        queryClient.invalidateQueries({
          queryKey: ["characterSheet", token, id],
        });
        navigate(`/charactersheet/${id}`, { replace: true });
      } catch {
        setSubmitError("Erro ao salvar. Tente novamente.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Profile-only mode
    const briefDesc = charSheet.profile.briefDescription ?? "";
    const existingBrief = existingSheet?.profile.briefDescription ?? "";
    const noChange = !avatarBlob && !coverBlob && briefDesc === existingBrief;
    if (noChange) {
      navigate(`/charactersheet/${id}`, { replace: true });
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    let resolvedAvatar: string | null = charSheet.profile.avatarUrl ?? null;
    let resolvedCover: string | null = charSheet.profile.coverUrl ?? null;
    try {
      if (avatarBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(
          token,
          "avatar",
          id,
        );
        await uploadService.uploadToR2(uploadUrl, avatarBlob);
        resolvedAvatar = publicUrl;
      }
      if (coverBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(
          token,
          "cover",
          id,
        );
        await uploadService.uploadToR2(uploadUrl, coverBlob);
        resolvedCover = publicUrl;
      }
      await characterSheetsService.patchCharacterSheetProfile(
        token,
        id,
        resolvedAvatar,
        resolvedCover,
        charSheet.profile.briefDescription ?? null,
      );
      queryClient.invalidateQueries({
        queryKey: ["characterSheet", token, id],
      });
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
        charClasses: editMode === "full" ? charClasses : undefined,
        isLoading:
          sheetLoading ||
          (editMode === "full" ? classesLoading : false) ||
          isSubmitting,
        error:
          editMode === "full" && classesError ? classesError.message : null,
        onAvatarSelected: handleAvatarSelected,
        onCoverSelected: handleCoverSelected,
        onCreateSheet: handleSave,
        submitLabel: editMode === "full" ? "Salvar Edição" : "Salvar Perfil",
        submitError,
      }}
    />
  );
}

export default EditCharacterSheetPage;
