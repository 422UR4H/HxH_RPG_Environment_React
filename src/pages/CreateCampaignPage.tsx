import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { campaignService } from "../services/campaignService";
import worldMap from "../assets/images/worldmap.png";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import styled from "styled-components";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";

interface CampaignFormData {
  name: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
}

export default function CreateCampaignPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { form, handleForm, setForm } = useForm<CampaignFormData>({
    name: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    callLink: "",
    storyStartAt: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    if (!form.name || !form.briefInitialDescription) {
      setError("Nome e descrição breve são obrigatórios.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      await campaignService.createCampaign(token!, form);
      navigate("/campaigns");
    } catch (error: any) {
      console.error("Erro ao criar campanha:", error);
      setError(
        error.response?.data?.message ||
          "Erro ao criar campanha. Tente novamente."
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
      <PageHeader to="/campaigns" backgroundColor="#08491f" />
      <PageBody>
        <MainContentContainer>
          <CreateCampaignContainer>
            <PageTitle>CRIAR NOVA CAMPANHA</PageTitle>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FormContainer onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleForm}
                  placeholder="Digite o nome da sua campanha"
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
                  placeholder="Uma breve descrição inicial da campanha"
                  resize="none"
                  rows={2}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="description">Descrição Completa</Label>
                <TextArea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleForm}
                  placeholder="Descreva sua campanha em detalhes"
                  rows={3}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="callLink">Link da Chamada</Label>
                <Input
                  id="callLink"
                  name="callLink"
                  value={form.callLink}
                  onChange={handleForm}
                  placeholder="Link para chamada de vídeo/áudio (Discord, Google Meet, etc.)"
                  autoComplete="off"
                />
              </FormGroup>

              <FormRow>
                <FormGroup style={{ flex: 1 }}>
                  <Label htmlFor="storyStartAt">
                    Data de Início da História
                  </Label>
                  <Input
                    id="storyStartAt"
                    name="storyStartAt"
                    type="date"
                    value={form.storyStartAt}
                    onChange={handleForm}
                    required
                  />
                </FormGroup>

                <FormGroup style={{ flex: 1 }}>
                  <Label>Visibilidade</Label>
                  <CheckboxContainer>
                    <Checkbox
                      id="isPublic"
                      name="isPublic"
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={handleTogglePublic}
                    />
                    <CheckboxLabel htmlFor="isPublic">
                      Campanha Pública
                    </CheckboxLabel>
                  </CheckboxContainer>
                  <HelpText>
                    Campanhas públicas podem ser vistas por todos os usuários
                  </HelpText>
                </FormGroup>
              </FormRow>

              <ButtonsContainer>
                <CancelButton
                  type="button"
                  onClick={() => navigate("/campaigns")}
                >
                  Cancelar
                </CancelButton>
                <SubmitButton type="submit" disabled={isLoading}>
                  {/* <PlusIcon /> */}
                  <label>{isLoading ? "Criando..." : "Criar Campanha"}</label>
                </SubmitButton>
              </ButtonsContainer>
            </FormContainer>
          </CreateCampaignContainer>
        </MainContentContainer>

        <RulesSidebar>
          <SidebarTitle>Regras da Campanha</SidebarTitle>
          <RulesContent>
            <RuleSection>
              <RuleSectionTitle>Configurações Gerais</RuleSectionTitle>
              <RuleInfo>
                As regras da campanha serão configuradas aqui.
              </RuleInfo>
            </RuleSection>

            <RuleSection>
              <RuleSectionTitle>Sistema de Combate</RuleSectionTitle>
              <RuleInfo>
                Configure o sistema de combate da sua campanha.
              </RuleInfo>
            </RuleSection>

            <RuleSection>
              <RuleSectionTitle>Progressão de Personagens</RuleSectionTitle>
              <RuleInfo>
                Define como os personagens evoluem durante a campanha.
              </RuleInfo>
            </RuleSection>

            <RuleSection>
              <RuleSectionTitle>Nen & Habilidades</RuleSectionTitle>
              <RuleInfo>
                Configure as regras para uso e desenvolvimento de Nen.
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

const CreateCampaignContainer = styled.div`
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
  /* background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%); */
  color: white;
  border: none;
  margin: 0 16px;

  transition: all 0.2s ease;

  * {
    cursor: pointer;
  }

  /* &:focus {
    outline: none;
  } */
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

  /* background: linear-gradient(#333, #333) padding-box,
    linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%) border-box;
  border: 2px solid transparent; */

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
