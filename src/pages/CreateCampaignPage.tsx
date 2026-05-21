import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCampaign } from "../hooks/useCreateCampaign";
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

interface CampaignFormData {
  name: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
}

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
    storyStartAt: new Date().toISOString().split("T")[0],
  });

  const { mutate: createCampaign, isPending } = useCreateCampaign(token);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.briefInitialDescription) {
      setError("Nome e descrição breve são obrigatórios.");
      return;
    }
    setError(null);
    createCampaign(form, {
      onSuccess: () => navigate(-1),
      onError: (err: any) => {
        setError(
          err.response?.data?.message ||
            "Erro ao criar campanha. Tente novamente."
        );
      },
    });
  };

  const handleTogglePublic = () => {
    setForm({ ...form, isPublic: !form.isPublic });
  };

  return (
    <CreateFormTemplate
      title="CRIAR NOVA CAMPANHA"
      error={error}
      onSubmit={handleSubmit}
      submitLabel="Criar Campanha"
      isSubmitting={isPending}
      onCancel={() => navigate(-1)}
      rulesContent={
        <RulesSidebar
          title="Regras da Campanha"
          footer="Mais opções de configuração serão adicionadas em breve."
        >
          <RuleSection title="Configurações Gerais">
            As regras da campanha serão configuradas aqui.
          </RuleSection>
          <RuleSection title="Sistema de Combate">
            Configure o sistema de combate da sua campanha.
          </RuleSection>
          <RuleSection title="Progressão de Personagens">
            Define como os personagens evoluem durante a campanha.
          </RuleSection>
          <RuleSection title="Nen & Habilidades">
            Configure as regras para uso e desenvolvimento de Nen.
          </RuleSection>
        </RulesSidebar>
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

      <FormField label="Descrição Completa" htmlFor="description">
        <FormTextArea
          id="description"
          name="description"
          value={form.description}
          onChange={handleForm}
          placeholder="Descreva sua campanha em detalhes"
          rows={3}
        />
      </FormField>

      <FormField label="Link da Chamada" htmlFor="callLink">
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
