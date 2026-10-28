import { type ReactNode } from "react";
import styled, { createGlobalStyle } from "styled-components";
import PageHeader from "../atoms/PageHeader";
import { PageLoading, PageError } from "./PageState";
import type { PageBackdrop, PageStateLink } from "./PageState";
import { colors } from "../../styles/tokens";
import { viewportScrollbar, scrollbarPalettes } from "../../styles/scrollbar";

interface ListPageTemplateProps {
  bgImage: string;
  headerColor?: string;
  bgAttachment?: "fixed" | "scroll";
  isPending?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  onRetry?: () => void;
  backdrop?: PageBackdrop;
  errorBack?: PageStateLink;
  children: ReactNode;
}

export default function ListPageTemplate({
  bgImage,
  headerColor = colors.brandPrimary,
  bgAttachment = "fixed",
  isPending,
  isError,
  loadingLabel = "Carregando…",
  errorLabel = "Não foi possível carregar a lista",
  onRetry,
  backdrop,
  errorBack = { label: "Voltar para o início", to: "/home" },
  children,
}: ListPageTemplateProps) {
  if (isPending) {
    return (
      <PageLoading
        label={loadingLabel}
        backdrop={backdrop}
        headerColor={headerColor}
      />
    );
  }
  if (isError) {
    return (
      <PageError
        title={errorLabel}
        onRetry={onRetry}
        back={errorBack}
        backdrop={backdrop}
        headerColor={headerColor}
      />
    );
  }
  return (
    <PageContainer $bgImage={bgImage} $bgAttachment={bgAttachment}>
      {backdrop === "world" && <WorldScrollbar />}
      <PageHeader backgroundColor={headerColor} />
      <PageBody>{children}</PageBody>
    </PageContainer>
  );
}

// Fundo de mapa-múndi: barra de rolagem marrom, como nas telas de campanha. A lista de
// personagens (fundo de espaço) fica com a barra global.
const WorldScrollbar = createGlobalStyle`
  ${viewportScrollbar(scrollbarPalettes.earth)}
`;

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
