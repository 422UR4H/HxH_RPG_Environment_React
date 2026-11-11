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
import { CAMPAIGN_LIMITS } from "../constants/fieldLimits";
import useFieldValidation, { focusField } from "../hooks/useFieldValidation";

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
  }, {
    name: CAMPAIGN_LIMITS.name.max,
    briefInitialDescription: CAMPAIGN_LIMITS.briefInitialDescription.max,
    callLink: CAMPAIGN_LIMITS.callLink.max,
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

  // Com partida iniciada, nome e início da história ficam travados (não vão no envio nem são conferidos).
  const hasStartedMatch = campaign?.matches?.some((m) => !!m.gameStartAt) ?? false;

  // História corrente (mesmas regras do back): não antes do início da história (o do formulário,
  // se ainda editável) e não antes do valor já gravado.
  const storyCurrentError = (value: string): string | null => {
    if (!campaign) return null;
    const newDate = new Date(`${value}:00Z`);
    const start = hasStartedMatch ? campaign.storyStartAt : form.storyStartAt || campaign.storyStartAt;
    if (newDate < new Date(start)) {
      return "A data corrente da história não pode ser anterior à data de início da história.";
    }
    if (campaign.storyCurrentAt && newDate < new Date(campaign.storyCurrentAt)) {
      return "A data corrente da história não pode ser anterior ao valor atual.";
    }
    return null;
  };

  const { errorFor, noticeFor, touch, validateAll } = useFieldValidation({
    name: {
      value: form.name,
      required: true,
      min: CAMPAIGN_LIMITS.name.min,
      minMessage: `O nome deve ter pelo menos ${CAMPAIGN_LIMITS.name.min} caracteres.`,
      max: CAMPAIGN_LIMITS.name.max,
      disabled: hasStartedMatch,
    },
    briefInitialDescription: {
      value: form.briefInitialDescription,
      required: true,
      max: CAMPAIGN_LIMITS.briefInitialDescription.max,
    },
    callLink: { value: form.callLink, max: CAMPAIGN_LIMITS.callLink.max },
    storyStartAt: { value: form.storyStartAt, required: true, disabled: hasStartedMatch },
    storyCurrentAt: { value: form.storyCurrentAt, validate: storyCurrentError },
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstInvalid = validateAll();
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    setError(null);
    const campaignData: Record<string, unknown> = {
      briefInitialDescription: form.briefInitialDescription,
      description: form.description,
      isPublic: form.isPublic,
      callLink: form.callLink,
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
      <FormField
        label="Nome da Campanha"
        htmlFor="name"
        error={errorFor("name")}
        notice={noticeFor("name")}
      >
        <FormInput
          id="name"
          name="name"
          value={form.name}
          onChange={handleForm}
          onCompositionEnd={handleForm}
          onBlur={() => touch("name")}
          placeholder="Nome da campanha"
          autoComplete="off"
          disabled={hasStartedMatch}
          required={!hasStartedMatch}
        />
      </FormField>

      <FormField
        label="Descrição Breve"
        htmlFor="briefInitialDescription"
        error={errorFor("briefInitialDescription")}
        notice={noticeFor("briefInitialDescription")}
      >
        <FormTextArea
          id="briefInitialDescription"
          name="briefInitialDescription"
          value={form.briefInitialDescription}
          onChange={handleForm}
          onCompositionEnd={handleForm}
          onBlur={() => touch("briefInitialDescription")}
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
          onCompositionEnd={handleForm}
          rows={3}
        />
      </FormField>

      <FormField
        label="Link da Chamada"
        htmlFor="callLink"
        optional
        error={errorFor("callLink")}
        notice={noticeFor("callLink")}
      >
        <FormInput
          id="callLink"
          name="callLink"
          value={form.callLink}
          onChange={handleForm}
          onCompositionEnd={handleForm}
          onBlur={() => touch("callLink")}
          autoComplete="off"
        />
      </FormField>

      <FormRow>
        <FormField label="Início da História" htmlFor="storyStartAt" error={errorFor("storyStartAt")}>
          <DateField
            id="storyStartAt"
            value={form.storyStartAt}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, storyStartAt: value }));
              touch("storyStartAt");
            }}
            disabled={hasStartedMatch}
            required={!hasStartedMatch}
          />
        </FormField>

        <FormField
          label="História Corrente"
          htmlFor="storyCurrentAt"
          helpText="Data atual dentro do universo da campanha"
          optional
          error={errorFor("storyCurrentAt")}
        >
          <DateField
            id="storyCurrentAt"
            withTime
            value={form.storyCurrentAt}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, storyCurrentAt: value }));
              touch("storyCurrentAt");
            }}
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
