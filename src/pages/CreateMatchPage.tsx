import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { matchService } from "../services/matchService";
import worldMap from "../assets/images/worldmap.png";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";

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
      <PageHeader to={`/campaigns/${campaignId}`} backgroundColor="#08491f" />
      <PageBody>
        <MainContentContainer>
          <CreateMatchContainer>
            <PageTitle>CRIAR NOVA PARTIDA</PageTitle>

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
                  autoComplete="off"
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
                  rows={2}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="description">
                  Descrição Completa (Opcional)
                </Label>
                <TextArea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleForm}
                  placeholder="Detalhes adicionais da partida (apenas para o mestre)"
                  rows={3}
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
                  <Label htmlFor="storyStartAt">
                    Data de Início na História
                  </Label>
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
      </PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;

  /* scrollbars custom */
  * {
    /* Webkit (Chrome, Safari, Edge) */
    &::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    &::-webkit-scrollbar-track {
      background: #42331f;
    }
    &::-webkit-scrollbar-thumb {
      background: #493823;
      border-radius: 6px;
      border: 2px solid #2d2215;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #5a4529;
    }
    &::-webkit-scrollbar-corner {
      background: #2d2215;
    }
  }
`;

const PageBody = styled.main`
  display: flex;
  color: white;
  min-height: 0;
  overflow: hidden;
`;

const MainContentContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;

  /* world map */
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

const CreateMatchContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 940px;
  width: 100%;
  padding: 30px;
`;

const RulesSidebar = styled.div`
  width: 50%;
  max-width: 450px;
  min-width: 350px;
  background-color: #2d2215;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  flex-shrink: 0;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

  gap: 30px;
  width: 100%;
`;

const Label = styled.label`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: white;
`;

const Input = styled.input`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #493823;
  border: 2px solid #604d31;
  border-radius: 6px;
  color: white;
  font-size: 24px;

  &:focus {
    outline: none;
    border-color: #107135;
  }
`;

const TextArea = styled.textarea<{ resize?: string }>`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #493823;
  border: 2px solid #604d31;
  border-radius: 6px;
  color: white;
  font-size: 24px;
  resize: ${({ resize }) => resize || "vertical"};

  &:focus {
    outline: none;
    border-color: #107135;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 24px;
  height: 24px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: 26px;
  cursor: pointer;
`;

const HelpText = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  margin-top: 4px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 15px;
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
  background-color: #107135;
  color: white;
  border: none;
  margin: 0 16px;

  transition: all 0.2s ease;

  * {
    cursor: pointer;
  }

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background-color: #7a5618;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  color: white;
  border: 1px solid white;

  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
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
  font-weight: 600;
  font-size: 32px;
  color: white;

  margin-bottom: 20px;
  border-bottom: 1px solid #696969;
  padding-bottom: 10px;
`;

const RulesContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const RuleSection = styled.div`
  background-color: #493823;
  border-radius: 8px;
  padding: 15px;
`;

const RuleSectionTitle = styled.h3`
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  font-size: 24px;
  margin-bottom: 10px;
  color: white;
`;

const RuleInfo = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  font-size: 20px;
  color: white;
  line-height: 1.4;
`;

const SidebarFooter = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 300;
  margin-top: 30px;
  font-size: 18px;
  color: white;
  font-style: italic;
  text-align: center;
`;
