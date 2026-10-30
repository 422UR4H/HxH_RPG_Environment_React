import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
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
import DateField from "../components/molecules/DateField";
import FormTextArea from "../components/ions/FormTextArea";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { getApiErrorDetail } from "../utils/apiError";
import { toDateTimeLocalValue } from "../utils/date";
import { incompleteInputMessage, missingRequiredMessage } from "../utils/requiredFields";

type CampaignEditFormData = {
  name: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
  storyCurrentAt: string;
};

function getErrorMessage(err: unknown): string {
  if (isApiError(err, 403)) return "Apenas o mestre pode editar esta campanha.";
  if (isApiError(err, 404)) return "Campanha não encontrada.";
  if (isApiError(err, 422)) {
    const detail = getApiErrorDetail(err);
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

  const {
    data: campaign,
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useCampaignDetails(token, id);

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
          ? toDateTimeLocalValue(campaign.storyCurrentAt)
          : "",
      });
      setInitialized(true);
    }
  }, [campaign, initialized, setForm]);

  const { mutate: updateCampaign, isPending: isSubmitting } = useUpdateCampaign(token, id);

  useDocumentTitle("Editar", campaign?.name);

  if (!token) return <Navigate to="/" replace />;

  const campaignBack = { label: "Voltar para a campanha", to: `/campaigns/${id}` };
  if (isError) {
    return isApiError(loadError, 404) ? (
      <PageNotFound title="Campanha não encontrada" back={campaignBack} />
    ) : (
      <PageError
        title="Não foi possível carregar a campanha"
        onRetry={() => void refetch()}
        back={campaignBack}
      />
    );
  }
  if (isPending) return <PageLoading label="Carregando campanha…" />;
  if (!campaign) return <PageNotFound title="Campanha não encontrada" back={campaignBack} />;

  const isMaster = campaign.masterUuid === user?.uuid;
  if (!isMaster) return <Navigate to={`/campaigns/${id}`} replace />;

  const hasStartedMatch = campaign.matches?.some((m) => !!m.gameStartAt) ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Com partida iniciada, nome e início da história ficam travados (não vão no envio).
    const missing =
      incompleteInputMessage(e.currentTarget as HTMLFormElement) ??
      missingRequiredMessage([
        ...(hasStartedMatch ? [] : [{ label: "Nome da Campanha", value: form.name }]),
        { label: "Descrição Breve", value: form.briefInitialDescription },
        ...(hasStartedMatch ? [] : [{ label: "Data de Início da História", value: form.storyStartAt }]),
      ]);
    if (missing) {
      setError(missing);
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
      submittingLabel="Salvando…"
      isSubmitting={isSubmitting}
      onCancel={() => navigate(-1)}
      rulesContent={
        <UpcomingRulesSidebar scope="campaign" />
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

      <FormField label="Descrição Completa" htmlFor="description" optional>
        <FormTextArea
          id="description"
          name="description"
          value={form.description}
          onChange={handleForm}
          rows={3}
        />
      </FormField>

      <FormField label="Link da Chamada" htmlFor="callLink" optional>
        <FormInput
          id="callLink"
          name="callLink"
          value={form.callLink}
          onChange={handleForm}
          autoComplete="off"
        />
      </FormField>

      <FormRow>
        <FormField label="Início da História" htmlFor="storyStartAt">
          <DateField
            id="storyStartAt"
            value={form.storyStartAt}
            onChange={(value) => setForm((prev) => ({ ...prev, storyStartAt: value }))}
            disabled={hasStartedMatch}
            required={!hasStartedMatch}
          />
        </FormField>

        <FormField
          label="História Corrente"
          htmlFor="storyCurrentAt"
          helpText="Data atual dentro do universo da campanha"
          optional
        >
          <DateField
            id="storyCurrentAt"
            withTime
            value={form.storyCurrentAt}
            onChange={(value) => setForm((prev) => ({ ...prev, storyCurrentAt: value }))}
            min={
              campaign.storyCurrentAt
                ? toDateTimeLocalValue(campaign.storyCurrentAt)
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
