import { type ReactNode } from "react";
import styled from "styled-components";
import PageHeader from "../atoms/PageHeader";
import { LoadingContainer, ErrorContainer } from "../atoms/PageStates";
import { colors } from "../../styles/tokens";

interface ListPageTemplateProps {
  bgImage: string;
  headerColor?: string;
  bgAttachment?: "fixed" | "scroll";
  isPending?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  children: ReactNode;
}

export default function ListPageTemplate({
  bgImage,
  headerColor = colors.brandPrimary,
  bgAttachment = "fixed",
  isPending,
  isError,
  loadingLabel = "Carregando...",
  errorLabel = "Falha ao carregar. Tente novamente mais tarde.",
  children,
}: ListPageTemplateProps) {
  if (isPending) {
    return <LoadingContainer>{loadingLabel}</LoadingContainer>;
  }
  if (isError) {
    return <ErrorContainer>{errorLabel}</ErrorContainer>;
  }
  return (
    <PageContainer $bgImage={bgImage} $bgAttachment={bgAttachment}>
      <PageHeader backgroundColor={headerColor} />
      <PageBody>{children}</PageBody>
    </PageContainer>
  );
}

const PageContainer = styled.div<{ $bgImage: string; $bgAttachment: string }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${({ $bgImage }) => $bgImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: ${({ $bgAttachment }) => $bgAttachment};
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 30px;
  width: 100vw;

  @media (max-width: 500px) {
    padding: 30px 0;
  }
`;
