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
import FormTextArea from "../components/ions/FormTextArea";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import { CONNECTION_ERROR_MESSAGE, getApiErrorDetail, isConnectionError } from "../utils/apiError";
import { getCampaignValidationMessage } from "../features/campaign/campaignErrorMessages";
import { toDateInputValue } from "../utils/date";
import { incompleteInputMessage, missingRequiredMessage } from "../utils/requiredFields";

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
    storyStartAt: toDateInputValue(new Date().toISOString()),
  });

  const { mutate: createCampaign, isPending } = useCreateCampaign(token);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing =
      incompleteInputMessage(e.currentTarget as HTMLFormElement) ??
      missingRequiredMessage([
        { label: "Nome da Campanha", value: form.name },
        { label: "Descrição Breve", value: form.briefInitialDescription },
        { label: "Data de Início da História", value: form.storyStartAt },
      ]);
    if (missing) {
      setError(missing);
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
      <FormField label="Nome da Campanha" htmlFor="name">
        <FormInput
          id="name"
          name="name"
          value={form.name}
          onChange={handleForm}
          placeholder="Digite o nome da sua campanha"
          autoComplete="off"
          required
        />
      </FormField>

      <FormField label="Descrição Breve" htmlFor="briefInitialDescription">
        <FormTextArea
          id="briefInitialDescription"
          name="briefInitialDescription"
          value={form.briefInitialDescription}
          onChange={handleForm}
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
          placeholder="Descreva sua campanha em detalhes"
          rows={3}
        />
      </FormField>

      <FormField label="Link da Chamada" htmlFor="callLink" optional>
        <FormInput
          id="callLink"
          name="callLink"
          value={form.callLink}
          onChange={handleForm}
          placeholder="Link para chamada de vídeo/áudio (Discord, Google Meet, etc.)"
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
