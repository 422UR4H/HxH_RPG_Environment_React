import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import useForm from "../hooks/useForm";
import { useCampaignDetails } from "../hooks/useCampaignDetails";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useUpdateMatch } from "../hooks/useUpdateMatch";
import { isApiError } from "../services/httpClient";
import { getMatchValidationMessage } from "../features/match/matchErrorMessages";
import {
  MATCH_TITLE_TOO_SHORT,
  SESSION_PASSED_NOTICE,
  sessionHasPassed,
  sessionDayBounds,
  sessionTimeError,
  storyStartError,
} from "../features/match/matchFieldRules";
import { MATCH_LIMITS } from "../constants/fieldLimits";
import useFieldValidation, { focusField } from "../hooks/useFieldValidation";
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
import { instantToLocalInput, localInputToInstant } from "../utils/date";

type MatchFormData = {
  title: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  storyStartAt: string;
};

function getErrorMessage(err: unknown): string {
  if (isApiError(err, 403)) return "Apenas o mestre pode editar esta partida.";
  if (isApiError(err, 404)) return "Partida não encontrada.";
  if (isApiError(err, 422)) {
    const detail = getApiErrorDetail(err);
    if (detail?.toLowerCase().includes("already started"))
      return "A partida já foi iniciada e não pode ser editada.";
    if (detail?.toLowerCase().includes("already finished"))
      return "A partida já foi encerrada e não pode ser editada.";
    return (
      getMatchValidationMessage(detail ?? "") ||
      "Dados inválidos. Verifique os campos e tente novamente."
    );
  }
  return "Erro ao salvar partida. Tente novamente.";
}

export default function EditMatchPage() {
  const { campaignId, matchId } = useParams<{
    campaignId: string;
    matchId: string;
  }>();
  const { token } = useToken();
  const { user } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const {
    data: match,
    isPending,
    isError,
    error: loadError,
    refetch,
  } = useMatchDetails(token, matchId);

  const { form, handleForm, setForm } = useForm<MatchFormData>({
    title: "",
    briefInitialDescription: "",
    description: "",
    isPublic: true,
    gameScheduledAt: "",
    storyStartAt: "",
  }, {
    title: MATCH_LIMITS.title.max,
    briefInitialDescription: MATCH_LIMITS.briefInitialDescription.max,
  });

  useEffect(() => {
    if (match && !initialized) {
      setForm({
        title: match.title,
        briefInitialDescription: match.briefInitialDescription,
        description: match.description,
        isPublic: match.isPublic,
        gameScheduledAt: instantToLocalInput(match.gameScheduledAt),
        storyStartAt: match.storyStartAt,
      });
      setInitialized(true);
    }
  }, [match, initialized, setForm]);

  const { mutate: updateMatch, isPending: isSubmitting } = useUpdateMatch(token, matchId);
  // A campanha só serve para conferir a data da história; sem ela (carregando ou com falha) o back responde.
  const { data: campaign } = useCampaignDetails(token, campaignId);

  // Sessão: só vale (e só vai no envio) se o mestre mudou o valor carregado; uma sessão já passada
  // não pode impedir de corrigir só o título.
  const sessionChanged = form.gameScheduledAt !== instantToLocalInput(match?.gameScheduledAt);

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
    gameScheduledAt: {
      value: form.gameScheduledAt,
      required: true,
      validate: sessionTimeError,
      disabled: !sessionChanged,
    },
    storyStartAt: {
      value: form.storyStartAt,
      required: true,
      validate: (v) => (campaign ? storyStartError(v, campaign) : null),
    },
  });

  useDocumentTitle("Editar", match?.title);

  if (!token) return <Navigate to="/" replace />;

  const matchBack = {
    label: "Voltar para a partida",
    to: `/campaigns/${campaignId}/matches/${matchId}`,
  };
  if (isError) {
    return isApiError(loadError, 404) ? (
      <PageNotFound title="Partida não encontrada" back={matchBack} />
    ) : (
      <PageError
        title="Não foi possível carregar a partida"
        onRetry={() => void refetch()}
        back={matchBack}
      />
    );
  }
  if (isPending) return <PageLoading label="Carregando partida…" />;
  if (!match) return <PageNotFound title="Partida não encontrada" back={matchBack} />;

  const isMaster = match.masterUuid === user?.uuid;
  if (!isMaster) return <Navigate to={`/campaigns/${campaignId}/matches/${matchId}`} replace />;
  if (match.gameStartAt) return <Navigate to={`/campaigns/${campaignId}/matches/${matchId}`} replace />;

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstInvalid = validateAll();
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    setError(null);
    const matchData = {
      title: form.title,
      briefInitialDescription: form.briefInitialDescription,
      description: form.description,
      isPublic: form.isPublic,
      ...(sessionChanged && { gameScheduledAt: localInputToInstant(form.gameScheduledAt) }),
      storyStartAt: form.storyStartAt,
    };
    updateMatch(matchData, {
      onSuccess: () => navigate(-1),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <CreateFormTemplate
      title="EDITAR PARTIDA"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Salvar Alterações"
      submittingLabel="Salvando…"
      isSubmitting={isSubmitting}
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
          notice={!sessionChanged && sessionHasPassed(form.gameScheduledAt) ? SESSION_PASSED_NOTICE : null}
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
