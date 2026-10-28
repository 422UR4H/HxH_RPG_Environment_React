import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import useForm from "../hooks/useForm";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useUpdateMatch } from "../hooks/useUpdateMatch";
import { isApiError } from "../services/httpClient";
import { getMatchValidationMessage } from "../features/match/matchErrorMessages";
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
  });

  useEffect(() => {
    if (match && !initialized) {
      setForm({
        title: match.title,
        briefInitialDescription: match.briefInitialDescription,
        description: match.description,
        isPublic: match.isPublic,
        gameScheduledAt: toDateTimeLocalValue(match.gameScheduledAt),
        storyStartAt: match.storyStartAt,
      });
      setInitialized(true);
    }
  }, [match, initialized, setForm]);

  const { mutate: updateMatch, isPending: isSubmitting } = useUpdateMatch(token, matchId);

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
    setError(null);
    const matchData = {
      title: form.title,
      briefInitialDescription: form.briefInitialDescription,
      description: form.description || undefined,
      isPublic: form.isPublic,
      gameScheduledAt: `${form.gameScheduledAt}:00Z`,
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
          <DateField
            id="gameScheduledAt"
            withTime
            value={form.gameScheduledAt}
            onChange={(value) => setForm((prev) => ({ ...prev, gameScheduledAt: value }))}
            required
          />
        </FormField>

        <FormField
          label="Data de Início na História"
          htmlFor="storyStartAt"
          helpText="Esta é a data dentro do universo da história"
        >
          <DateField
            id="storyStartAt"
            value={form.storyStartAt}
            onChange={(value) => setForm((prev) => ({ ...prev, storyStartAt: value }))}
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
