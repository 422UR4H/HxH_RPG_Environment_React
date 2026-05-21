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
