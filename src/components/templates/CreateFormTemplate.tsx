import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import SignFormError from "../atoms/SignFormError";
import EdgeDrawer, { EDGE_TAB_HIT } from "../molecules/EdgeDrawer";
import useMediaQuery from "../../hooks/useMediaQuery";
import PageTitle from "../ions/PageTitle";
import worldMap from "../../assets/images/worldmap.png";
import { colors } from "../../styles/tokens";
import { scopedScrollbar, scrollbarPalettes } from "../../styles/scrollbar";

interface CreateFormTemplateProps {
  title: string;
  headerColor?: string;
  error?: string | null;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  rulesContent?: ReactNode;
  children: ReactNode;
}

export default function CreateFormTemplate({
  title,
  headerColor = colors.brandPrimary,
  error,
  onSubmit,
  submitLabel,
  submittingLabel = "Criando…",
  isSubmitting,
  onCancel,
  rulesContent,
  children,
}: CreateFormTemplateProps) {
  const isRulesCollapsed = useMediaQuery("(max-width: 1149px)");
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const openRules = useCallback(() => setIsRulesOpen(true), []);
  const closeRules = useCallback(() => setIsRulesOpen(false), []);

  useEffect(() => {
    if (!isRulesCollapsed) setIsRulesOpen(false);
  }, [isRulesCollapsed]);

  return (
    <PageContainer>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>
        <MainContentContainer>
          <FormColumn $reserveEdges={isRulesCollapsed && !!rulesContent}>
            <PageTitle>{title}</PageTitle>

            {error && <SignFormError message={error} tone="dark" />}

            {/* noValidate: sem balão do navegador; a página checa os obrigatórios e mostra o erro acima (FOR-06). */}
            <Form onSubmit={onSubmit} noValidate>
              {children}

              <ButtonsContainer>
                <ButtonsRow>
                  <CancelButton type="button" onClick={onCancel}>
                    Cancelar
                  </CancelButton>
                  <SubmitButton type="submit" disabled={isSubmitting}>
                    {isSubmitting ? submittingLabel : submitLabel}
                  </SubmitButton>
                </ButtonsRow>
              </ButtonsContainer>
            </Form>
          </FormColumn>
        </MainContentContainer>

        {!isRulesCollapsed && rulesContent}
        {isRulesCollapsed && rulesContent && (
          <EdgeDrawer
            side="right"
            label="REGRAS"
            open={isRulesOpen}
            onOpen={openRules}
            onClose={closeRules}
            width={400}
          >
            {rulesContent}
          </EdgeDrawer>
        )}
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

  ${scopedScrollbar(scrollbarPalettes.earth)}
`;

const PageBody = styled.main`
  display: flex;
  color: ${colors.textPrimary};
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: visible;
  position: relative;
`;

const MainContentContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  /* A barra de rolagem come uns 12 px só do lado direito. Reservar a mesma faixa dos
     dois lados mantém as margens do formulário iguais, com ou sem barra. */
  scrollbar-gutter: stable both-edges;

  /* world map */
  background-image: url(${worldMap});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
`;

const FormColumn = styled.div<{ $reserveEdges: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 940px;
  width: 100%;
  padding: 30px;
  /* Aba REGRAS visível: a área de toque dela não cobre o formulário. A reserva vale
     dos dois lados para a margem esquerda ficar igual à direita. */
  ${({ $reserveEdges }) => $reserveEdges && `padding-inline: ${EDGE_TAB_HIT}px;`}
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

/* Largura mínima do contêiner para "Cancelar" + "Salvar Alterações" ficarem lado a lado:
   169 + 15 (gap) + 270 + 2 × 16 (margem do SubmitButton) = 486 px; 500 dá folga. Abaixo
   disso empilha, em vez de deixar o flex-wrap quebrar com larguras próprias e recuo. */
const STACK_BELOW = "500px";

/* Contêiner de consulta: a decisão depende da largura do próprio bloco dos botões, não da tela. */
const ButtonsContainer = styled.div`
  container-type: inline-size;
`;

const ButtonsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 15px;

  @container (max-width: ${STACK_BELOW}) {
    & > * {
      flex: 1 1 100%;
    }
    /* && sobe a especificidade: o SubmitButton é declarado depois e a margem dele venceria. */
    && > * {
      margin: 0;
      /* Rótulo numa linha só até 320 px: primeiro encolhe o padding lateral (32 -> 12 px),
         depois a fonte. O rótulo ocupa ~8,4 × a fonte; 28 px = padding 2 × 12 + borda. Piso de 20 px. */
      padding-inline: 12px;
      font-size: clamp(20px, calc((100cqw - 28px) / 8.4), 26px);
    }
  }
`;

const Button = styled.button`
  padding: 16px 32px;
  border-radius: 6px;
  font-size: 26px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
`;

const SubmitButton = styled(Button)`
  background-color: ${colors.brandAccent};
  color: ${colors.textPrimary};
  border: none;
  margin: 0 16px;

  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }

  &:disabled {
    background-color: ${colors.actionDisabled};
    cursor: not-allowed;
  }
`;

const CancelButton = styled(Button)`
  background-color: transparent;
  color: ${colors.textPrimary};
  border: 1px solid ${colors.textPrimary};

  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
