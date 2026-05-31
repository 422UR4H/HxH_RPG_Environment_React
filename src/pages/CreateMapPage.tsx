// src/pages/CreateMapPage.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";
import useToken from "../hooks/useToken";
import { useCreateMap } from "../hooks/useCreateMap";

const friendlyMessages: Record<string, string> = {
  name_required: "O nome do mapa é obrigatório.",
  "name is required": "O nome do mapa é obrigatório.",
};

export default function CreateMapPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { token } = useToken();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: createMap, isPending } = useCreateMap(token, campaignId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do mapa é obrigatório.");
      return;
    }
    setError(null);
    createMap(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => navigate(`/campaigns/${campaignId}`),
        onError: (err: any) => {
          console.error("[CreateMapPage]", err.response?.data);
          const detail: string = err.response?.data?.detail ?? "";
          setError(
            friendlyMessages[detail] || "Erro ao criar mapa. Tente novamente.",
          );
        },
      },
    );
  };

  if (!token) return null;

  return (
    <PageWrapper>
      <PageTitle>Criar Mapa</PageTitle>
      <Form onSubmit={handleSubmit}>
        <Label>
          Nome *
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Floresta do Norte"
            maxLength={255}
            autoFocus
          />
        </Label>
        <Label>
          Descrição
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do mapa"
            rows={4}
          />
        </Label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ButtonRow>
          <CancelButton
            type="button"
            onClick={() => navigate(`/campaigns/${campaignId}`)}
          >
            Cancelar
          </CancelButton>
          <SubmitButton type="submit" disabled={isPending}>
            {isPending ? "Criando..." : "Criar Mapa"}
          </SubmitButton>
        </ButtonRow>
      </Form>
    </PageWrapper>
  );
}

const PageWrapper = styled.div`
  max-width: 600px;
  margin: 60px auto;
  padding: 0 24px;
`;

const PageTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 32px;
  font-weight: 900;
  color: ${colors.textPrimary};
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Label = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  color: ${colors.textDisabled};
`;

const Input = styled.input`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 12px 16px;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
`;

const Textarea = styled.textarea`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textPrimary};
  background-color: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: 12px 16px;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }

  &::placeholder {
    color: ${colors.textPlaceholder};
  }
`;

const ErrorMessage = styled.p`
  font-family: ${fonts.sans};
  font-size: 14px;
  color: ${colors.accentDanger};
  border-left: 3px solid ${colors.accentDanger};
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
  background: ${colors.overlaySoft};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: filter 0.15s;

  &:hover {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: none;
  }
`;

const CancelButton = styled(BaseButton)`
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

const SubmitButton = styled(BaseButton)`
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
`;
