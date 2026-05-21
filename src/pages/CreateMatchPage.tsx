import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateMatch } from "../hooks/useCreateMatch";
import useToken from "../hooks/useToken";
import useForm from "../hooks/useForm";
import CreateFormTemplate from "../components/templates/CreateFormTemplate";
import FormField from "../components/molecules/FormField";
import FormRow from "../components/molecules/FormRow";
import FormCheckbox from "../components/molecules/FormCheckbox";
import FormInput from "../components/ions/FormInput";
import FormTextArea from "../components/ions/FormTextArea";
import RulesSidebar from "../components/organisms/RulesSidebar";
import RuleSection from "../components/molecules/RuleSection";

interface MatchFormData {
  title: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  storyStartAt: string;
}

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
    gameScheduledAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 16),
    storyStartAt: new Date().toISOString().split("T")[0],
  });

  const { mutate: createMatch, isPending } = useCreateMatch(token, campaignId);

  const formatDateToISOString = (dateTimeString: string): string =>
    `${dateTimeString}:00Z`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.briefInitialDescription) {
      setError("Título e descrição breve são obrigatórios.");
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
      onError: (err: any) => {
        setError(
          err.response?.data?.message ||
            "Erro ao criar partida. Tente novamente."
        );
      },
    });
  };

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };

  return (
    <CreateFormTemplate
      title="CRIAR NOVA PARTIDA"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Criar Partida"
      isSubmitting={isPending}
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
