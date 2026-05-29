import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import useForm from "../hooks/useForm";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useUpdateCampaign } from "../hooks/useUpdateCampaign";
import { isApiError } from "../services/httpClient";
import { getCampaignValidationMessage } from "../features/campaign/campaignErrorMessages";
import CreateFormTemplate from "../components/templates/CreateFormTemplate";
import FormField from "../components/molecules/FormField";
import FormRow from "../components/molecules/FormRow";
import FormCheckbox from "../components/molecules/FormCheckbox";
import FormInput from "../components/ions/FormInput";
import FormTextArea from "../components/ions/FormTextArea";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";

interface CampaignEditFormData {
  name: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
  storyCurrentAt: string;
}

function toDateTimeLocal(iso: string): string {
  return iso.replace("Z", "").substring(0, 16);
}

function getErrorMessage(err: unknown): string {
  if (isApiError(err, 403)) return "Apenas o mestre pode editar esta campanha.";
  if (isApiError(err, 404)) return "Campanha não encontrada.";
  if (isApiError(err, 422)) {
    const detail = (err as any).response?.data?.detail as string | undefined;
    return (
      getCampaignValidationMessage(detail ?? "") ||
      "Dados inválidos. Verifique os campos e tente novamente."
    );
  }
  return "Erro ao salvar campanha. Tente novamente.";
}

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: campaign, isPending, isError } = useCampaignDetails(token, id);

  const { form, handleForm, setForm } = useForm<CampaignEditFormData>({
    name: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    callLink: "",
    storyStartAt: "",
    storyCurrentAt: "",
  });

  useEffect(() => {
    if (campaign && !initialized) {
      setForm({
        name: campaign.name,
        briefInitialDescription: campaign.briefInitialDescription,
        description: campaign.description,
        isPublic: campaign.isPublic,
        callLink: campaign.callLink,
        storyStartAt: campaign.storyStartAt,
        storyCurrentAt: campaign.storyCurrentAt
          ? toDateTimeLocal(campaign.storyCurrentAt)
          : "",
      });
      setInitialized(true);
    }
  }, [campaign, initialized, setForm]);

  const { mutate: updateCampaign, isPending: isSubmitting } = useUpdateCampaign(token, id);

  if (!token) return <Navigate to="/" replace />;

  if (isPending) return <LoadingContainer>Carregando campanha...</LoadingContainer>;
  if (isError) return <ErrorContainer>Falha ao carregar campanha.</ErrorContainer>;
  if (!campaign) return <ErrorContainer>Campanha não encontrada.</ErrorContainer>;

  const isMaster = campaign.masterUuid === user?.uuid;
  if (!isMaster) return <Navigate to={`/campaigns/${id}`} replace />;

  const hasStartedMatch = campaign.matches?.some((m) => !!m.gameStartAt) ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!hasStartedMatch && !form.name) || !form.briefInitialDescription) {
      setError("Nome e descrição breve são obrigatórios.");
      return;
    }
    if (form.storyCurrentAt) {
      const newDate = new Date(`${form.storyCurrentAt}:00Z`);
      if (newDate < new Date(campaign.storyStartAt)) {
        setError("A data corrente da história não pode ser anterior à data de início da história.");
        return;
      }
      if (campaign.storyCurrentAt && newDate < new Date(campaign.storyCurrentAt)) {
        setError("A data corrente da história não pode ser anterior ao valor atual.");
        return;
      }
    }
    setError(null);
    const campaignData: Record<string, unknown> = {
      briefInitialDescription: form.briefInitialDescription,
      description: form.description || undefined,
      isPublic: form.isPublic,
      callLink: form.callLink || undefined,
      storyCurrentAt: form.storyCurrentAt
        ? `${form.storyCurrentAt}:00Z`
        : undefined,
    };
    if (!hasStartedMatch) {
      campaignData.name = form.name;
      campaignData.storyStartAt = form.storyStartAt;
    }
    updateCampaign(campaignData, {
      onSuccess: () => navigate(-1),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <CreateFormTemplate
      title="EDITAR CAMPANHA"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Salvar Alterações"
      submittingLabel="Salvando..."
      isSubmitting={isSubmitting}
      onCancel={() => navigate(-1)}
      rulesContent={
        <RulesSidebar
          title="Regras da Campanha"
          footer="Mais opções de configuração serão adicionadas em breve."
        >
          <RuleSection title="Configurações Gerais">
            As regras da campanha serão configuradas aqui.
          </RuleSection>
          <RuleSection title="Sistema de Combate">
            Configure o sistema de combate da sua campanha.
          </RuleSection>
          <RuleSection title="Progressão de Personagens">
            Define como os personagens evoluem durante a campanha.
          </RuleSection>
          <RuleSection title="Nen & Habilidades">
            Configure as regras para uso e desenvolvimento de Nen.
          </RuleSection>
        </RulesSidebar>
      }
    >
      <FormField label="Nome da Campanha" htmlFor="name">
        <FormInput
          id="name"
          name="name"
          value={form.name}
          onChange={handleForm}
          placeholder="Nome da campanha"
          autoComplete="off"
          disabled={hasStartedMatch}
          required={!hasStartedMatch}
        />
      </FormField>

      <FormField label="Descrição Breve" htmlFor="briefInitialDescription">
        <FormTextArea
          id="briefInitialDescription"
          name="briefInitialDescription"
          value={form.briefInitialDescription}
          onChange={handleForm}
          $resize="none"
          rows={2}
          required
        />
      </FormField>

      <FormField label="Descrição Completa" htmlFor="description">
        <FormTextArea
          id="description"
          name="description"
          value={form.description}
          onChange={handleForm}
          rows={3}
        />
      </FormField>

      <FormField label="Link da Chamada" htmlFor="callLink">
        <FormInput
          id="callLink"
          name="callLink"
          value={form.callLink}
          onChange={handleForm}
          autoComplete="off"
        />
      </FormField>

      <FormRow>
        <FormField label="Data de Início da História" htmlFor="storyStartAt">
          <FormInput
            id="storyStartAt"
            name="storyStartAt"
            type="date"
            value={form.storyStartAt}
            onChange={handleForm}
            disabled={hasStartedMatch}
            required={!hasStartedMatch}
          />
        </FormField>

        <FormField
          label="Data Corrente da História"
          htmlFor="storyCurrentAt"
          helpText="Data atual dentro do universo da campanha"
        >
          <FormInput
            id="storyCurrentAt"
            name="storyCurrentAt"
            type="datetime-local"
            value={form.storyCurrentAt}
            onChange={handleForm}
            min={
              campaign.storyCurrentAt
                ? toDateTimeLocal(campaign.storyCurrentAt)
                : `${campaign.storyStartAt}T00:00`
            }
          />
        </FormField>
      </FormRow>

      <FormCheckbox
        id="isPublic"
        name="isPublic"
        label="Campanha Pública"
        checked={form.isPublic}
        onChange={() => setForm({ ...form, isPublic: !form.isPublic })}
        helpText="Campanhas públicas podem ser vistas por todos"
      />
    </CreateFormTemplate>
  );
}
