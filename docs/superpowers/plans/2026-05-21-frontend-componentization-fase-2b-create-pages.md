# Frontend Componentization — Fase 2b: CreateFormTemplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar a duplicação estrutural entre `CreateCampaignPage` e `CreateMatchPage` extraindo um `CreateFormTemplate` + componentes de formulário (`FormField`, `FormRow`, `FormCheckbox`, `FormInput`, `FormTextArea`), e reconciliando a sidebar de regras inline dessas páginas com o organism `RulesSidebar` (criado na Fase 1).

**Architecture:** Slot-based. `CreateFormTemplate` é o shell (header + coluna de form com título/erro/`<form>`/botões + slot de regras). As páginas viram thin orchestrators: hooks de form + compõem `FormField`s e a `RulesSidebar`.

**Tech Stack:** React 19, TypeScript estrito (`verbatimModuleSyntax`, `noUnusedLocals`), styled-components, Vitest + MSW.

**Spec de referência:** `docs/superpowers/specs/2026-05-20-frontend-componentization-design.md` (§4.6; §6 — reconciliação da rules sidebar).

---

## Contexto crítico para quem executa

- **Refatoração.** Comportamento travado por characterization tests da Fase 0: `CreateCampaignPage.test.tsx` (8 testes), `CreateMatchPage.test.tsx` (8). **Os 16 testes devem continuar passando, sem edição.** Nenhum teste novo.
- **Uma mudança visual intencional / spec-sancionada:** a sidebar de regras das Create pages hoje é inline e larga (`width: 50%; max-width: 450px; min-width: 350px`). Passa a usar o organism `RulesSidebar` (criado na Fase 1, `width: 300px`). A spec §6 previu explicitamente essa reconciliação para a Fase 2. A largura encolhe ~450→300px.
- Fora isso, **pixel-perfect**: header, título, campos do form, botões, conteúdo das regras renderizam idênticos.
- **Zona pixel-tuned — NÃO TOCAR.**
- Um commit atômico por task. `rtk`: use `npm`/`git` simples.
- Baseline atual: `npm test` → 89 testes passando. `npm run build` → verde.
- Componentes da Fase 1 já no repo e reutilizados aqui: `src/components/organisms/RulesSidebar.tsx` (props `{ title?, children, footer? }`) e `src/components/molecules/RuleSection.tsx` (props `{ title, children }`).

---

## File Structure

**Arquivos criados:**

- `src/components/ions/FormInput.tsx` — input de formulário estilizado (tema marrom das Create pages).
- `src/components/ions/FormTextArea.tsx` — textarea de formulário estilizado (prop transiente `$resize`).
- `src/components/molecules/FormField.tsx` — grupo rótulo + campo + texto de ajuda opcional.
- `src/components/molecules/FormRow.tsx` — linha em grid pra dois campos lado a lado.
- `src/components/molecules/FormCheckbox.tsx` — checkbox + rótulo inline + ajuda + rótulo de grupo opcional.
- `src/components/templates/CreateFormTemplate.tsx` — shell de página de criação.

**Arquivos modificados:**

- `src/pages/CreateCampaignPage.tsx` — vira thin orchestrator.
- `src/pages/CreateMatchPage.tsx` — idem.

**Não modificados:** os 2 arquivos de teste em `src/pages/__tests__/` — devem passar sem edição.

---

## Task 1: Criar `FormInput` e `FormTextArea` (ions)

**Files:**
- Create: `src/components/ions/FormInput.tsx`
- Create: `src/components/ions/FormTextArea.tsx`

Inputs de formulário estilizados, extraídos dos styled-components `Input`/`TextArea` hoje duplicados (idênticos) em `CreateCampaignPage` e `CreateMatchPage`. São styled-components exportados diretamente — encaminham todos os atributos HTML padrão (`id`, `name`, `value`, `onChange`, `placeholder`, `type`, `required`, `rows`, `autoComplete`).

- [ ] **Step 1: Criar `src/components/ions/FormInput.tsx`**

```tsx
import styled from "styled-components";

const FormInput = styled.input`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #493823;
  border: 2px solid #604d31;
  border-radius: 6px;
  color: white;
  font-size: 24px;

  &:focus {
    outline: none;
    border-color: #107135;
  }
`;

export default FormInput;
```

- [ ] **Step 2: Criar `src/components/ions/FormTextArea.tsx`**

O `resize` é uma prop transiente (`$resize`) pra não vazar pro DOM (styled-components v6). Default `vertical`.

```tsx
import styled from "styled-components";

const FormTextArea = styled.textarea<{ $resize?: string }>`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #493823;
  border: 2px solid #604d31;
  border-radius: 6px;
  color: white;
  font-size: 24px;
  resize: ${({ $resize }) => $resize || "vertical"};

  &:focus {
    outline: none;
    border-color: #107135;
  }
`;

export default FormTextArea;
```

- [ ] **Step 3: Build** — `npm run build` — verde.
- [ ] **Step 4: Rodar a suite** — `npm test` — 89 testes passando.
- [ ] **Step 5: Commit**

```bash
git add src/components/ions/FormInput.tsx src/components/ions/FormTextArea.tsx
git commit -m "feat(components): add FormInput and FormTextArea ions"
```

## Context

Task 1 of 5 da Fase 2b. Esses inputs serão consumidos pelos `FormField`s das Create pages (Tasks 4-5). Sem testes próprios — cobertos pelos integration tests das páginas. TS estrito, `verbatimModuleSyntax`, `noUnusedLocals`.

## Before You Begin

Ask if anything unclear. Crie os dois arquivos verbatim.

## Self-Review

- Ambos os arquivos com o código exato acima
- `npm run build` verde, `npm test` → 89
- Commit único, mensagem exata, só os 2 arquivos novos

## Report

Status + commit SHA + build/test + concerns.

---

## Task 2: Criar `FormField`, `FormRow` e `FormCheckbox` (molecules)

**Files:**
- Create: `src/components/molecules/FormField.tsx`
- Create: `src/components/molecules/FormRow.tsx`
- Create: `src/components/molecules/FormCheckbox.tsx`

Três moléculas de layout de formulário, extraídas dos padrões `FormGroup`/`FormRow`/`Checkbox` hoje duplicados nas Create pages.

- [ ] **Step 1: Criar `src/components/molecules/FormField.tsx`**

```tsx
import { type ReactNode } from "react";
import styled from "styled-components";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  helpText?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, helpText, children }: FormFieldProps) {
  return (
    <Group>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {helpText && <HelpText>{helpText}</HelpText>}
    </Group>
  );
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: white;
`;

const HelpText = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  margin-top: 4px;
`;
```

- [ ] **Step 2: Criar `src/components/molecules/FormRow.tsx`**

```tsx
import { type ReactNode } from "react";
import styled from "styled-components";

interface FormRowProps {
  children: ReactNode;
}

export default function FormRow({ children }: FormRowProps) {
  return <Row>{children}</Row>;
}

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  width: 100%;
`;
```

- [ ] **Step 3: Criar `src/components/molecules/FormCheckbox.tsx`**

`groupLabel` é opcional — renderiza um rótulo de seção acima do checkbox (usado pelo `CreateCampaignPage`, que tem um rótulo "Visibilidade"; `CreateMatchPage` não passa).

```tsx
import styled from "styled-components";

interface FormCheckboxProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  helpText?: string;
  groupLabel?: string;
}

export default function FormCheckbox({
  id,
  name,
  label,
  checked,
  onChange,
  helpText,
  groupLabel,
}: FormCheckboxProps) {
  return (
    <Group>
      {groupLabel && <GroupLabel>{groupLabel}</GroupLabel>}
      <CheckboxContainer>
        <Checkbox id={id} name={name} type="checkbox" checked={checked} onChange={onChange} />
        <CheckboxLabel htmlFor={id}>{label}</CheckboxLabel>
      </CheckboxContainer>
      {helpText && <HelpText>{helpText}</HelpText>}
    </Group>
  );
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const GroupLabel = styled.span`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: white;
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 24px;
  height: 24px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: 26px;
  cursor: pointer;
`;

const HelpText = styled.p`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: 18px;
  color: white;
  margin-top: 4px;
`;
```

- [ ] **Step 4: Build** — `npm run build` — verde.
- [ ] **Step 5: Rodar a suite** — `npm test` — 89 testes passando.
- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/FormField.tsx src/components/molecules/FormRow.tsx src/components/molecules/FormCheckbox.tsx
git commit -m "feat(components): add FormField, FormRow and FormCheckbox molecules"
```

## Context

Task 2 of 5. `verbatimModuleSyntax` — `import { type ReactNode }` inline. `FormCheckbox` não usa `ReactNode` (não importa). Sem testes próprios.

## Self-Review

- 3 arquivos com o código exato; `npm run build` verde; `npm test` → 89; commit único, só os 3 novos.

## Report

Status + commit SHA + build/test + concerns.

---

## Task 3: Criar `CreateFormTemplate` (template)

**Files:**
- Create: `src/components/templates/CreateFormTemplate.tsx`

Shell de página de criação: `PageHeader` + body flex com a coluna central de formulário (título + erro + `<form>` + botões Cancelar/Criar) e um slot `rulesContent` à direita. Os estilos derivam dos styled-components hoje duplicados (idênticos) em `CreateCampaignPage`/`CreateMatchPage`. O template é dono da fileira de botões (ambas as Create pages têm exatamente Cancelar + Criar).

- [ ] **Step 1: Criar `src/components/templates/CreateFormTemplate.tsx`**

```tsx
import { type FormEvent, type ReactNode } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import PageTitle from "../ions/PageTitle";
import worldMap from "../../assets/images/worldmap.png";

interface CreateFormTemplateProps {
  title: string;
  headerColor?: string;
  error?: string | null;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  rulesContent?: ReactNode;
  children: ReactNode;
}

export default function CreateFormTemplate({
  title,
  headerColor = "#08491f",
  error,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
  rulesContent,
  children,
}: CreateFormTemplateProps) {
  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>
        <MainContentContainer>
          <FormColumn>
            <PageTitle>{title}</PageTitle>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Form onSubmit={onSubmit}>
              {children}

              <ButtonsContainer>
                <CancelButton type="button" onClick={onCancel}>
                  Cancelar
                </CancelButton>
                <SubmitButton type="submit" disabled={isSubmitting}>
                  <label>{isSubmitting ? "Criando..." : submitLabel}</label>
                </SubmitButton>
              </ButtonsContainer>
            </Form>
          </FormColumn>
        </MainContentContainer>

        {rulesContent}
      </PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;

  /* scrollbars custom */
  * {
    &::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    &::-webkit-scrollbar-track {
      background: #42331f;
    }
    &::-webkit-scrollbar-thumb {
      background: #493823;
      border-radius: 6px;
      border: 2px solid #2d2215;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #5a4529;
    }
    &::-webkit-scrollbar-corner {
      background: #2d2215;
    }
  }
`;

const PageBody = styled.main`
  display: flex;
  color: white;
  min-height: 0;
  overflow: hidden;
`;

const MainContentContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;

  /* world map */
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

const FormColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 940px;
  width: 100%;
  padding: 30px;
`;

const ErrorMessage = styled.div`
  background-color: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 15px;
`;

const Button = styled.button`
  padding: 16px 32px;
  border-radius: 6px;
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
`;

const SubmitButton = styled(Button)`
  background-color: #107135;
  color: white;
  border: none;
  margin: 0 16px;

  transition: all 0.2s ease;

  * {
    cursor: pointer;
  }

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background-color: #7a5618;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  color: white;
  border: 1px solid white;

  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
```

- [ ] **Step 2: Build** — `npm run build` — verde. `PageHeader` é default export em `atoms/`; `PageTitle` é default export em `ions/`; `worldmap.png` está em `src/assets/images/`.
- [ ] **Step 3: Rodar a suite** — `npm test` — 89 testes passando.
- [ ] **Step 4: Commit**

```bash
git add src/components/templates/CreateFormTemplate.tsx
git commit -m "feat(components): add CreateFormTemplate"
```

## Context

Task 3 of 5. Será consumido pelas 2 Create pages (Tasks 4-5). Slot `rulesContent` recebe a `RulesSidebar` montada pela página. O template é dono dos botões Cancelar/Criar — ambas as páginas têm exatamente esse par. `verbatimModuleSyntax` — `import { type FormEvent, type ReactNode }`.

## Self-Review

- Arquivo com o código exato; `npm run build` verde; `npm test` → 89; commit único, só o arquivo novo.

## Report

Status + commit SHA + build/test + concerns.

---

## Task 4: Refatorar `CreateCampaignPage`

**Files:**
- Modify: `src/pages/CreateCampaignPage.tsx` (reescrita completa)

A lógica (hooks `useToken`/`useForm`/`useCreateCampaign`, `error` state, `handleSubmit`, `handleTogglePublic`, a interface `CampaignFormData`) **não muda**. Substituir o conteúdo INTEIRO de `src/pages/CreateCampaignPage.tsx` por:

```tsx
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
```

- [ ] **Step 1: Substituir o arquivo inteiro pelo conteúdo acima.**
- [ ] **Step 2: Build** — `npm run build` — verde. `noUnusedLocals` pega imports sobrando.
- [ ] **Step 3: Rodar os testes do CreateCampaignPage** — `npx vitest run src/pages/__tests__/CreateCampaignPage.test.tsx` — 8 testes passando, arquivo de teste NÃO editado. Se algum falhar, corrigir `CreateCampaignPage.tsx`.
- [ ] **Step 4: Suite completa** — `npm test` — 89 testes passando.
- [ ] **Step 5: Commit**

```bash
git add src/pages/CreateCampaignPage.tsx
git commit -m "refactor(pages): rebuild CreateCampaignPage on CreateFormTemplate"
```

## Context

Task 4 of 5. `CreateCampaignPage.tsx` (~488 linhas, com ~25 styled-components) vira um thin orchestrator (~150 linhas, ZERO styled-components, sem `import styled`). Os `getByLabelText` dos testes dependem da associação `<label htmlFor>` ↔ `id` do input — `FormField` faz isso (`Label htmlFor` + o `FormInput id`). O checkbox: `FormCheckbox` associa `CheckboxLabel htmlFor={id}` ↔ `Checkbox id` — `getByLabelText(/Campanha Pública/i)` casa. Read the current file first.

## Self-Review

- Arquivo substituído pelo conteúdo exato; sem styled-components, sem `import styled`
- `npm run build` verde; 8 testes do CreateCampaignPage passam, arquivo de teste intocado; `npm test` → 89
- Commit único, mensagem exata, só `CreateCampaignPage.tsx`

## Report

Status + commit SHA + test results + concerns.

---

## Task 5: Refatorar `CreateMatchPage`

**Files:**
- Modify: `src/pages/CreateMatchPage.tsx` (reescrita completa)

A lógica (hooks, `error` state, `formatDateToISOString`, `handleSubmit`, `handleTogglePublic`, a interface `MatchFormData`) **não muda**. Substituir o conteúdo INTEIRO de `src/pages/CreateMatchPage.tsx` por:

```tsx
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
```

- [ ] **Step 1: Substituir o arquivo inteiro pelo conteúdo acima.**
- [ ] **Step 2: Build** — `npm run build` — verde.
- [ ] **Step 3: Rodar os testes do CreateMatchPage** — `npx vitest run src/pages/__tests__/CreateMatchPage.test.tsx` — 8 testes passando, arquivo de teste NÃO editado.
- [ ] **Step 4: Suite completa + build** — `npm test` (89) e `npm run build` (verde).
- [ ] **Step 5: Commit**

```bash
git add src/pages/CreateMatchPage.tsx
git commit -m "refactor(pages): rebuild CreateMatchPage on CreateFormTemplate"
```

## Context

Task 5 of 5. `CreateMatchPage.tsx` (~499 linhas) vira thin orchestrator (~165 linhas, ZERO styled-components). `FormInput type="datetime-local"` para `gameScheduledAt`. O `FormInput` é `styled.input` — encaminha `type` normalmente. `CreateMatchPage` não tem `groupLabel` no checkbox (diferente do CreateCampaignPage). Read the current file first.

## Self-Review

- Arquivo substituído; sem styled-components, sem `import styled`
- `npm run build` verde; 8 testes do CreateMatchPage passam, arquivo de teste intocado; `npm test` → 89
- Commit único, mensagem exata, só `CreateMatchPage.tsx`

## Report

Status + commit SHA + test results + concerns.

---

## Self-review checklist (executor faz antes de fechar a fase)

- [ ] `npm run build` verde
- [ ] `npm test` verde — 89 testes (mesma contagem da baseline; esta fase não adiciona testes)
- [ ] `npm run lint` verde
- [ ] Os 16 testes das 2 Create pages passam **sem terem sido editados**
- [ ] As 2 páginas não têm mais nenhum styled-component nem `import styled`
- [ ] Nenhum arquivo da zona pixel-tuned foi tocado
- [ ] Smoke test manual: `npm run dev`, abrir `/campaigns/new` e `/campaigns/:id/matches/new` — título, campos do form, botões idênticos; a sidebar de regras agora tem ~300px (organism `RulesSidebar`) em vez de ~450px (mudança esperada, sancionada pela spec §6)

## Next phase

Quando a Fase 2b estiver mergeada: a Fase 2 (lista + form) está completa. Próxima sessão: `superpowers:writing-plans` para a **Fase 3** (design tokens + visual cleanup).
