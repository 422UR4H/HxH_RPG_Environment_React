import { useState, useRef, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import { characterSheetsService } from "../services/characterSheetsService";
import { uploadService } from "../services/uploadService";
import BackButton from "../components/ions/BackButton";
import styled from "styled-components";

function EditCharacterSheetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: charSheet, isLoading } = useCharacterSheet(token, id);

  const [briefDescription, setBriefDescription] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const avatarUrlRef = useRef<string | undefined>(undefined);
  const coverUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (charSheet) {
      setBriefDescription(charSheet.profile.briefDescription ?? "");
      setAvatarPreview(charSheet.profile.avatarUrl);
      setCoverPreview(charSheet.profile.coverUrl);
    }
  }, [charSheet]);

  useEffect(() => {
    return () => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    };
  }, []);

  if (!token || !id) return <Navigate to="/" replace />;

  if (charSheet && user) {
    if (charSheet.playerUuid !== user.uuid) return <Navigate to={`/charactersheet/${id}`} replace />;
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBlob(file);
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    const url = URL.createObjectURL(file);
    avatarUrlRef.current = url;
    setAvatarPreview(url);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverBlob(file);
    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    const url = URL.createObjectURL(file);
    coverUrlRef.current = url;
    setCoverPreview(url);
  };

  const handleSave = async () => {
    if (!token || !id || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    let resolvedAvatar: string | null | undefined = avatarBlob ? undefined : (charSheet?.profile.avatarUrl ?? null);
    let resolvedCover: string | null | undefined = coverBlob ? undefined : (charSheet?.profile.coverUrl ?? null);
    try {
      if (avatarBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "avatar", id);
        await uploadService.uploadToR2(uploadUrl, avatarBlob);
        resolvedAvatar = publicUrl;
      }
      if (coverBlob) {
        const { uploadUrl, publicUrl } = await uploadService.getPresignedUrl(token, "cover", id);
        await uploadService.uploadToR2(uploadUrl, coverBlob);
        resolvedCover = publicUrl;
      }
      await characterSheetsService.patchCharacterSheetProfile(
        token, id,
        resolvedAvatar ?? null,
        resolvedCover ?? null,
        briefDescription || null,
      );
      queryClient.invalidateQueries({ queryKey: ["characterSheet", token, id] });
      navigate(`/charactersheet/${id}`, { replace: true });
    } catch {
      setSubmitError("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Container><p style={{ color: "white" }}>Carregando...</p></Container>;

  return (
    <Container>
      <BackButton />
      <Title>Editar Perfil</Title>

      <Section>
        <Label>Avatar</Label>
        {avatarPreview && <Preview src={avatarPreview} alt="avatar" />}
        <FileInput type="file" accept="image/*" onChange={handleAvatarChange} />
      </Section>

      <Section>
        <Label>Capa</Label>
        {coverPreview && <CoverPreview src={coverPreview} alt="capa" />}
        <FileInput type="file" accept="image/*" onChange={handleCoverChange} />
      </Section>

      <Section>
        <Label>Descrição breve</Label>
        <Textarea
          value={briefDescription}
          onChange={(e) => setBriefDescription(e.target.value)}
          maxLength={255}
          placeholder="Descreva brevemente seu personagem..."
          rows={4}
        />
        <CharCount>{briefDescription.length}/255</CharCount>
      </Section>

      {submitError && <ErrorText>{submitError}</ErrorText>}

      <SaveButton onClick={handleSave} disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar"}
      </SaveButton>
    </Container>
  );
}

export default EditCharacterSheetProfilePage;

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 30px 20px;
  color: white;
  background: black;
  min-height: 100vh;
`;

const Title = styled.h1`
  font-family: "Roboto", sans-serif;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 30px;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  color: #aaa;
  margin-bottom: 8px;
`;

const Preview = styled.img`
  display: block;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 8px;
  border: 2px solid #555;
`;

const CoverPreview = styled.img`
  display: block;
  width: 100%;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
  margin-bottom: 8px;
  border: 2px solid #555;
`;

const FileInput = styled.input`
  color: white;
  font-family: "Roboto", sans-serif;
  font-size: 14px;
`;

const Textarea = styled.textarea`
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #555;
  border-radius: 8px;
  color: white;
  font-family: "Roboto", sans-serif;
  font-size: 16px;
  padding: 12px;
  resize: vertical;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #ffa216; }
`;

const CharCount = styled.div`
  font-size: 12px;
  color: #666;
  text-align: right;
  margin-top: 4px;
`;

const ErrorText = styled.p`
  color: #f38ba8;
  font-size: 14px;
  margin-bottom: 16px;
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%);
  border: none;
  border-radius: 8px;
  color: black;
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-2px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
