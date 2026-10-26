import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useCreateMatch } from "../hooks/useCreateMatch";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import useToken from "../hooks/useToken";
import { getMatchValidationMessage } from "../features/match/matchErrorMessages";
import useForm from "../hooks/useForm";
import CreateFormTemplate from "../components/templates/CreateFormTemplate";
import FormField from "../components/molecules/FormField";
import FormRow from "../components/molecules/FormRow";
import FormCheckbox from "../components/molecules/FormCheckbox";
import FormInput from "../components/ions/FormInput";
import FormTextArea from "../components/ions/FormTextArea";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { isApiError } from "../services/httpClient";
import { getApiErrorDetail } from "../utils/apiError";
import { toDateInputValue, toDateTimeLocalValue } from "../utils/date";
import { incompleteInputMessage, missingRequiredMessage } from "../utils/requiredFields";

type MatchFormData = {
  title: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  storyStartAt: string;
};

export default function CreateMatchPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { form, handleForm, setForm } = useForm<MatchFormData>({
    title: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    gameScheduledAt: toDateTimeLocalValue(
      new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ),
    storyStartAt: toDateInputValue(new Date().toISOString()),
  });

  const {
    data: campaign,
    isPending: campaignPending,
    isError: campaignError,
    error: campaignLoadError,
    refetch: refetchCampaign,
  } = useCampaignDetails(token, campaignId);
  const { mutate: createMatch, isPending } = useCreateMatch(token, campaignId);

  useEffect(() => {
    if (campaign?.storyStartAt) {
      setForm((prev) => ({ ...prev, storyStartAt: campaign.storyStartAt }));
    }
  }, [campaign?.storyStartAt, setForm]);

  const formatDateToISOString = (dateTimeString: string): string =>
    `${dateTimeString}:00Z`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing =
      incompleteInputMessage(e.currentTarget as HTMLFormElement) ??
      missingRequiredMessage([
        { label: "Título da Partida", value: form.title },
        { label: "Descrição Breve", value: form.briefInitialDescription },
        { label: "Data e Hora da Sessão", value: form.gameScheduledAt },
        { label: "Data de Início na História", value: form.storyStartAt },
      ]);
    if (missing) {
      setError(missing);
      return;
    }
    // O min/max do campo não barra mais o envio (noValidate): a mesma regra do back, sem a ida à API.
    const outsideCampaign =
      campaign?.storyStartAt && form.storyStartAt < campaign.storyStartAt
        ? "validation error: story start date must be after campaign start date"
        : campaign?.storyEndAt && form.storyStartAt > campaign.storyEndAt
          ? "validation error: story start date must be before campaign end date"
          : null;
    if (outsideCampaign) {
      setError(getMatchValidationMessage(outsideCampaign) ?? null);
      return;
    }
    setError(null);
    const matchData = {
      ...form,
      gameScheduledAt: formatDateToISOString(form.gameScheduledAt),
      campaignUuid: campaignId,
    };
    createMatch(matchData, {
      onSuccess: () => navigate(-1),
      onError: (err: unknown) => {
        const detail = getApiErrorDetail(err) ?? "";
        setError(
          getMatchValidationMessage(detail) ||
            "Não foi possível criar a partida. Verifique os dados e tente novamente."
        );
      },
    });
  };

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };

  useDocumentTitle("Nova partida");

  if (!token) return <Navigate to="/" replace />;
  if (!campaignId) return <Navigate to="/campaigns" replace />;
  const campaignBack = { label: "Voltar para a campanha", to: `/campaigns/${campaignId}` };
  if (campaignError) {
    return isApiError(campaignLoadError, 404) ? (
      <PageNotFound title="Campanha não encontrada" back={campaignBack} />
    ) : (
      <PageError
        title="Não foi possível carregar a campanha"
        onRetry={() => void refetchCampaign()}
        back={campaignBack}
      />
    );
  }
  if (campaignPending) return <PageLoading label="Carregando campanha…" />;
  if (!campaign) return <PageNotFound title="Campanha não encontrada" back={campaignBack} />;

  return (
    <CreateFormTemplate
      title="CRIAR NOVA PARTIDA"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Criar Partida"
      isSubmitting={isPending}
      onCancel={() => navigate(-1)}
      rulesContent={
        <UpcomingRulesSidebar scope="match" />
      }
    >
      <FormField label="Título da Partida" htmlFor="title">
        <FormInput
          id="title"
          name="title"
          value={form.title}
          onChange={handleForm}
          placeholder="Digite o título da partida"
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
          placeholder="Uma breve descrição inicial da partida"
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
          placeholder="Detalhes adicionais da partida (apenas para o mestre)"
          rows={3}
        />
      </FormField>

      <FormRow>
        <FormField
          label="Data e Hora da Sessão"
          htmlFor="gameScheduledAt"
          helpText="Esta é a data e hora real em que a sessão de jogo acontecerá"
        >
          <FormInput
            id="gameScheduledAt"
            name="gameScheduledAt"
            type="datetime-local"
            value={form.gameScheduledAt}
            onChange={handleForm}
            required
          />
        </FormField>

        <FormField
          label="Data de Início na História"
          htmlFor="storyStartAt"
          helpText="Esta é a data dentro do universo da história"
        >
          <FormInput
            id="storyStartAt"
            name="storyStartAt"
            type="date"
            value={form.storyStartAt}
            onChange={handleForm}
            min={campaign?.storyStartAt}
            max={campaign?.storyEndAt ?? undefined}
            required
          />
        </FormField>
      </FormRow>

      <FormCheckbox
        id="isPublic"
        name="isPublic"
        label="Partida Pública"
        checked={form.isPublic}
        onChange={handleTogglePublic}
        helpText="Partidas públicas podem ser vistas por todos os jogadores"
      />
    </CreateFormTemplate>
  );
}
