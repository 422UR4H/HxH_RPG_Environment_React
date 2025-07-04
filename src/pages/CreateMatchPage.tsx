import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import { matchService } from "../services/matchService";
import PageHeader from "../components/atoms/PageHeader";

interface MatchFormData {
  title: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  gameStartAt: string;
  storyStartAt: string;
}

export default function CreateMatchPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { form, handleForm, setForm } = useForm<MatchFormData>({
    title: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    gameStartAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 16), // One week ahead format YYYY-MM-DDTHH:MM
    storyStartAt: new Date().toISOString().split("T")[0], // Today as default
  });

  const formatDateToISOString = (dateTimeString: string): string => {
    // Add ":00Z" to the end to complete the ISO 8601 format
    return `${dateTimeString}:00Z`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (!form.title || !form.briefInitialDescription) {
      setError("Título e descrição breve são obrigatórios.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Adds campaign UUID and story_start_at format to form data
      const matchData = {
        ...form,
        gameStartAt: formatDateToISOString(form.gameStartAt),
        campaignUuid: campaignId,
      };
      await matchService.createMatch(token!, matchData);

      navigate(`/campaigns/${campaignId}`);
    } catch (error: any) {
      console.error("Erro ao criar partida:", error);
      setError(
        error.response?.data?.message ||
          "Erro ao criar partida. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublic = () => {
    setForm({
      ...form,
      isPublic: !form.isPublic,
    });
  };

  return (
    <PageContainer>
      <MainContentContainer>
        <CreateMatchContainer>
          <PageHeader
            title="Criar Nova Partida"
            to={`/campaigns/${campaignId}`}
          />

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <FormContainer onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="title">Título da Partida</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleForm}
                placeholder="Digite o título da partida"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="briefInitialDescription">Descrição Breve</Label>
              <TextArea
                id="briefInitialDescription"
                name="briefInitialDescription"
                value={form.briefInitialDescription}
                onChange={handleForm}
                placeholder="Uma breve descrição inicial da partida"
                resize="none"
                rows={2.5}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Descrição Completa (Opcional)</Label>
              <TextArea
                id="description"
                name="description"
                value={form.description}
                onChange={handleForm}
                placeholder="Detalhes adicionais da partida (apenas para o mestre)"
                rows={6}
              />
            </FormGroup>

            <FormRow>
              <FormGroup style={{ flex: 1 }}>
                <Label htmlFor="gameStartAt">Data e Hora da Sessão</Label>
                <Input
                  id="gameStartAt"
                  name="gameStartAt"
                  type="datetime-local"
                  value={form.gameStartAt}
                  onChange={handleForm}
                  required
                />
                <HelpText>
                  Esta é a data e hora real em que a sessão de jogo acontecerá
                </HelpText>
              </FormGroup>

              <FormGroup style={{ flex: 1 }}>
                <Label htmlFor="storyStartAt">Data de Início na História</Label>
                <Input
                  id="storyStartAt"
                  name="storyStartAt"
                  type="date"
                  value={form.storyStartAt}
                  onChange={handleForm}
                  required
                />
                <HelpText>
                  Esta é a data dentro do universo da história
                </HelpText>
              </FormGroup>
            </FormRow>

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  id="isPublic"
                  name="isPublic"
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={handleTogglePublic}
                />
                <CheckboxLabel htmlFor="isPublic">
                  Partida Pública
                </CheckboxLabel>
              </CheckboxContainer>
              <HelpText>
                Partidas públicas podem ser vistas por todos os jogadores
              </HelpText>
            </FormGroup>

            <ButtonsContainer>
              <CancelButton
                type="button"
                onClick={() => navigate(`/campaigns/${campaignId}`)}
              >
                Cancelar
              </CancelButton>
              <SubmitButton type="submit" disabled={isLoading}>
                <label>{isLoading ? "Criando..." : "Criar Partida"}</label>
              </SubmitButton>
            </ButtonsContainer>
          </FormContainer>
        </CreateMatchContainer>
      </MainContentContainer>

      <RulesSidebar>
        <SidebarTitle>Regras da Partida</SidebarTitle>
        <RulesContent>
          <RuleSection>
            <RuleSectionTitle>Configurações da Partida</RuleSectionTitle>
            <RuleInfo>
              Configure regras específicas para esta sessão de jogo.
            </RuleInfo>
          </RuleSection>

          <RuleSection>
            <RuleSectionTitle>Sistema de Encontros</RuleSectionTitle>
            <RuleInfo>
              Configure os encontros e desafios para esta partida.
            </RuleInfo>
          </RuleSection>

          <RuleSection>
            <RuleSectionTitle>Recompensas</RuleSectionTitle>
            <RuleInfo>
              Defina as recompensas que os jogadores poderão obter.
            </RuleInfo>
          </RuleSection>

          <RuleSection>
            <RuleSectionTitle>Eventos Narrativos</RuleSectionTitle>
            <RuleInfo>
              Configure eventos especiais que ocorrerão nesta partida.
            </RuleInfo>
          </RuleSection>
        </RulesContent>
        <SidebarFooter>
          Mais opções de configuração serão adicionadas em breve.
        </SidebarFooter>
      </RulesSidebar>
    </PageContainer>
  );
}

// TODO: componentize replicated styles from the campaign creation page
const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
  color: white;
  background-color: #333;
`;

const MainContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  overflow-y: auto;
  height: 100vh;
  height: 100dvh;
`;

const CreateMatchContainer = styled.div`
  width: 100%;
  max-width: 1200px;
`;

const RulesSidebar = styled.div`
  width: 450px;
  background-color: #2a2a2a;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  flex-shrink: 0;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 30px;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const Label = styled.label`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: bold;
  color: #e0e0e0;
`;

const Input = styled.input`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #444;
  border: 1px solid #555;
  border-radius: 6px;
  color: white;
  font-size: 24px;

  &:focus {
    outline: none;
    border-color: #ffa216;
  }
`;

const TextArea = styled.textarea<{ resize?: string }>`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #444;
  border: 1px solid #555;
  border-radius: 6px;
  color: white;
  font-size: 24px;
  resize: ${({ resize }) => resize || "vertical"};
  min-height: 60px;

  &:focus {
    outline: none;
    border-color: #ffa216;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  cursor: pointer;
`;

const HelpText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 18px;
  color: #9f9f9f;
  margin-top: 4px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 16px 32px;
  border-radius: 6px;
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
`;

const SubmitButton = styled(Button)`
  background-color: #ffa216;
  color: #1d1d1d;
  border: none;
  margin: 0 16px;

  &:hover {
    background-color: #ff8c00;
  }

  &:disabled {
    background-color: #7a5618;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  color: white;
  border: 1px solid #666;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const ErrorMessage = styled.div`
  background-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
`;

const SidebarTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: 32px;
  color: #ffa216;
  margin-bottom: 20px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
`;

const RulesContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const RuleSection = styled.div`
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
`;

const RuleSectionTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #e0e0e0;
`;

const RuleInfo = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  color: #9f9f9f;
  line-height: 1.4;
`;

const SidebarFooter = styled.div`
  font-family: "Roboto", sans-serif;
  margin-top: 30px;
  font-size: 18px;
  color: #777;
  font-style: italic;
  text-align: center;
`;
