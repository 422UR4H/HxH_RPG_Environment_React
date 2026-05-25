import { type FormEvent, type ReactNode } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import PageTitle from "../ions/PageTitle";
import worldMap from "../../assets/images/worldmap.png";
import { colors, fonts } from "../../styles/tokens";

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
  submittingLabel = "Criando...",
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
                  {isSubmitting ? submittingLabel : submitLabel}
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
      background: ${colors.surfaceScrollTrack};
    }
    &::-webkit-scrollbar-thumb {
      background: ${colors.surfaceInput};
      border-radius: 6px;
      border: 2px solid ${colors.surfaceSidebar};
    }
    &::-webkit-scrollbar-thumb:hover {
      background: ${colors.surfaceScrollThumbHover};
    }
    &::-webkit-scrollbar-corner {
      background: ${colors.surfaceSidebar};
    }
  }
`;

const PageBody = styled.main`
  display: flex;
  color: ${colors.textPrimary};
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
  background-color: ${colors.errorBg};
  color: ${colors.danger};
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
  font-family: ${fonts.sans};
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
    background-color: ${colors.submitDisabled};
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
