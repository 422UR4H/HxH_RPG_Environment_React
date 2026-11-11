import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useCreateMatch } from "../hooks/useCreateMatch";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import useToken from "../hooks/useToken";
import { getMatchValidationMessage } from "../features/match/matchErrorMessages";
import {
  MATCH_TITLE_TOO_SHORT,
  sessionDayBounds,
  sessionTimeError,
  storyStartError,
} from "../features/match/matchFieldRules";
import { MATCH_LIMITS } from "../constants/fieldLimits";
import useFieldValidation, { focusField } from "../hooks/useFieldValidation";
import useForm from "../hooks/useForm";
import CreateFormTemplate from "../components/templates/CreateFormTemplate";
import FormField from "../components/molecules/FormField";
import FormRow from "../components/molecules/FormRow";
import FormCheckbox from "../components/molecules/FormCheckbox";
import FormInput from "../components/ions/FormInput";
import DateField from "../components/molecules/DateField";
import FormTextArea from "../components/ions/FormTextArea";
import UpcomingRulesSidebar from "../components/organisms/UpcomingRulesSidebar";
import { PageLoading, PageError, PageNotFound } from "../components/templates/PageState";
import { isApiError } from "../services/httpClient";
import { getApiErrorDetail } from "../utils/apiError";
import { localInputToInstant, todayLocalISODate, toLocalDateTimeInputValue } from "../utils/date";

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
    gameScheduledAt: toLocalDateTimeInputValue(
      new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
    ),
    storyStartAt: todayLocalISODate(),
  }, {
    title: MATCH_LIMITS.title.max,
    briefInitialDescription: MATCH_LIMITS.briefInitialDescription.max,
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

  const sessionBounds = sessionDayBounds();
  const { errorFor, noticeFor, touch, validateAll } = useFieldValidation({
    title: {
      value: form.title,
      required: true,
      min: MATCH_LIMITS.title.min,
      minMessage: MATCH_TITLE_TOO_SHORT,
      max: MATCH_LIMITS.title.max,
    },
    briefInitialDescription: {
      value: form.briefInitialDescription,
      required: true,
      max: MATCH_LIMITS.briefInitialDescription.max,
    },
    gameScheduledAt: { value: form.gameScheduledAt, required: true, validate: sessionTimeError },
    storyStartAt: {
      value: form.storyStartAt,
      required: true,
      validate: (v) => (campaign ? storyStartError(v, campaign) : null),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstInvalid = validateAll();
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    setError(null);
    const matchData = {
      ...form,
      gameScheduledAt: localInputToInstant(form.gameScheduledAt),
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
      <FormField
        label="Título da Partida"
        htmlFor="title"
        error={errorFor("title")}
        notice={noticeFor("title")}
      >
        <FormInput
          id="title"
          name="title"
          value={form.title}
          onChange={handleForm}
          onBlur={() => touch("title")}
          placeholder="Título da partida"
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
          onBlur={() => touch("briefInitialDescription")}
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
          error={errorFor("gameScheduledAt")}
          helpText="Esta é a data e hora real em que a sessão de jogo acontecerá"
        >
          <DateField
            id="gameScheduledAt"
            withTime
            value={form.gameScheduledAt}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, gameScheduledAt: value }));
              touch("gameScheduledAt");
            }}
            min={sessionBounds.min}
            max={sessionBounds.max}
            required
          />
        </FormField>

        <FormField
          label="Data de Início na História"
          htmlFor="storyStartAt"
          error={errorFor("storyStartAt")}
          helpText="Esta é a data dentro do universo da história"
        >
          <DateField
            id="storyStartAt"
            value={form.storyStartAt}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, storyStartAt: value }));
              touch("storyStartAt");
            }}
            min={campaign?.storyStartAt}
            max={campaign?.storyEndAt ?? undefined}
            required
          />
        </FormField>
        {/* TODO: hora de início na história (opcional) — o back já aceita `storyStartTime` e o
            campo existe em components/molecules/TimeOfDayField.tsx, mas o visual será revisto com
            o designer. Até lá o mestre informa a hora ao iniciar a partida, na mesa (/game). */}
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
