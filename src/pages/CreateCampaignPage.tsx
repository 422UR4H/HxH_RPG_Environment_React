import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useCreateCampaign } from "../hooks/useCreateCampaign";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import CreateFormTemplate from "../components/templates/CreateFormTemplate";
import FormField from "../components/molecules/FormField";
import FormRow from "../components/molecules/FormRow";
import FormCheckbox from "../components/molecules/FormCheckbox";
import FormInput from "../components/ions/FormInput";
import DateField from "../components/molecules/DateField";
import FormTextArea from "../components/ions/FormTextArea";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import { CONNECTION_ERROR_MESSAGE, getApiErrorDetail, isConnectionError } from "../utils/apiError";
import { getCampaignValidationMessage } from "../features/campaign/campaignErrorMessages";
import { todayLocalISODate } from "../utils/date";
import { CAMPAIGN_LIMITS } from "../constants/fieldLimits";
import useFieldValidation, { focusField } from "../hooks/useFieldValidation";

type CampaignFormData = {
  name: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
};

export default function CreateCampaignPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { form, handleForm, setForm } = useForm<CampaignFormData>({
    name: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    callLink: "",
    storyStartAt: todayLocalISODate(),
  }, {
    name: CAMPAIGN_LIMITS.name.max,
    briefInitialDescription: CAMPAIGN_LIMITS.briefInitialDescription.max,
    callLink: CAMPAIGN_LIMITS.callLink.max,
  });

  const { mutate: createCampaign, isPending } = useCreateCampaign(token);

  const { errorFor, noticeFor, touch, validateAll } = useFieldValidation({
    name: {
      value: form.name,
      required: true,
      min: CAMPAIGN_LIMITS.name.min,
      minMessage: `O nome deve ter pelo menos ${CAMPAIGN_LIMITS.name.min} caracteres.`,
      max: CAMPAIGN_LIMITS.name.max,
    },
    briefInitialDescription: {
      value: form.briefInitialDescription,
      required: true,
      max: CAMPAIGN_LIMITS.briefInitialDescription.max,
    },
    callLink: { value: form.callLink, max: CAMPAIGN_LIMITS.callLink.max },
    storyStartAt: { value: form.storyStartAt, required: true },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstInvalid = validateAll();
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    setError(null);
    createCampaign(form, {
      onSuccess: () => navigate(-1),
      onError: (err: unknown) => {
        if (isConnectionError(err)) {
          setError(CONNECTION_ERROR_MESSAGE);
          return;
        }
        setError(
          getCampaignValidationMessage(getApiErrorDetail(err) ?? "") ??
            "Erro ao criar campanha. Tente novamente.",
        );
      },
    });
  };

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };

  useDocumentTitle("Nova campanha");

  if (!token) return <Navigate to="/" replace />;

  return (
    <CreateFormTemplate
      title="CRIAR NOVA CAMPANHA"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Criar Campanha"
      isSubmitting={isPending}
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
          required
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
          placeholder="Uma breve descrição inicial da campanha"
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
          placeholder="Descreva sua campanha em detalhes"
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
          placeholder="Discord, Meet, etc."
          autoComplete="off"
        />
      </FormField>

      <FormRow>
        <FormField
          label="Data de Início da História"
          htmlFor="storyStartAt"
          error={errorFor("storyStartAt")}
        >
          <DateField
            id="storyStartAt"
            value={form.storyStartAt}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, storyStartAt: value }));
              touch("storyStartAt");
            }}
            required
          />
        </FormField>

        <FormCheckbox
          id="isPublic"
          name="isPublic"
          groupLabel="Visibilidade"
          label="Campanha Pública"
          checked={form.isPublic}
          onChange={handleTogglePublic}
          helpText="Campanhas públicas podem ser vistas por todos os usuários"
        />
      </FormRow>
    </CreateFormTemplate>
  );
}
