import { useState, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useToken from "../hooks/useToken";
import useUser from "../hooks/useUser";
import useForm from "../hooks/useForm";
import { useMatchDetails } from "../hooks/useMatchDetails";
import { useUpdateMatch } from "../hooks/useUpdateMatch";
import { isApiError } from "../services/httpClient";
import { getMatchValidationMessage } from "../utils/matchErrorMessages";
import CreateFormTemplate from "../components/templates/CreateFormTemplate";
import FormField from "../components/molecules/FormField";
import FormRow from "../components/molecules/FormRow";
import FormCheckbox from "../components/molecules/FormCheckbox";
import FormInput from "../components/ions/FormInput";
import FormTextArea from "../components/ions/FormTextArea";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";
import { LoadingContainer, ErrorContainer } from "../components/atoms/PageStates";

interface MatchFormData {
  title: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  storyStartAt: string;
}

function toDateTimeLocal(iso: string): string {
  return iso.replace("Z", "").substring(0, 16);
}

function getErrorMessage(err: unknown): string {
  if (isApiError(err, 403)) return "Apenas o mestre pode editar esta partida.";
  if (isApiError(err, 404)) return "Partida não encontrada.";
  if (isApiError(err, 422)) {
    const detail = (err as any).response?.data?.detail as string | undefined;
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

  const { data: match, isPending, isError } = useMatchDetails(token, matchId);

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
        gameScheduledAt: toDateTimeLocal(match.gameScheduledAt),
        storyStartAt: match.storyStartAt,
      });
      setInitialized(true);
    }
  }, [match, initialized, setForm]);

  const { mutate: updateMatch, isPending: isSubmitting } = useUpdateMatch(token, matchId);

  if (!token) return <Navigate to="/" replace />;

  if (isPending) return <LoadingContainer>Carregando partida...</LoadingContainer>;
  if (isError) return <ErrorContainer>Falha ao carregar partida.</ErrorContainer>;
  if (!match) return <ErrorContainer>Partida não encontrada.</ErrorContainer>;

  const isMaster = match.masterUuid === user?.uuid;
  if (!isMaster) return <Navigate to={`/campaigns/${campaignId}/matches/${matchId}`} replace />;
  if (match.gameStartAt) return <Navigate to={`/campaigns/${campaignId}/matches/${matchId}`} replace />;

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.briefInitialDescription) {
      setError("Título e descrição breve são obrigatórios.");
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
      submittingLabel="Salvando..."
      isSubmitting={isSubmitting}
      onCancel={() => navigate(-1)}
      rulesContent={
        <RulesSidebar
          title="Regras da Partida"
          footer="Mais opções de configuração serão adicionadas em breve."
        >
          <RuleSection title="Configurações da Partida">
            Configure regras específicas para esta sessão de jogo.
          </RuleSection>
          <RuleSection title="Sistema de Encontros">
            Configure os encontros e desafios para esta partida.
          </RuleSection>
          <RuleSection title="Recompensas">
            Defina as recompensas que os jogadores poderão obter.
          </RuleSection>
          <RuleSection title="Eventos Narrativos">
            Configure eventos especiais que ocorrerão nesta partida.
          </RuleSection>
        </RulesSidebar>
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

      <FormField label="Descrição Completa (Opcional)" htmlFor="description">
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
