import { styled } from "styled-components";
import { type ReactNode } from "react";
import Logo from "../ions/Logo";
import { colors, gradients } from "../../styles/tokens";

interface SignPagesTemplateProps {
  children: ReactNode;
}

export default function SignPagesTemplate({
  children,
}: SignPagesTemplateProps) {
  return (
    <StyledSignTemplates>
      <div className="form-div">
        <Logo />
        {children}
      </div>
    </StyledSignTemplates>
  );
}

export const StyledSignTemplates = styled.div`
  background: ${gradients.signBg};
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 30px;

  .form-div {
    /* O dourado do anel global some no branco do cartão. */
    --focus-ring: ${colors.actionHighlightOnLight};
    background-color: ${colors.textPrimary};
    width: min(535px, 100vw);
    border-radius: 24px;
    padding: 30px;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
  }

  a {
    font-size: min(20px, 6vw);
    font-weight: 600;
    line-height: 24px;
    text-align: center;
    color: ${colors.textLinkOnLight};
  }

  /* O link mais largo (20px) ocupa ~262px. Com a barra de rolagem de 12px (o cadastro rola em
     telas baixas), o cartão só o comporta de 346px de janela em diante; abaixo disso ele encolhe
     para continuar numa linha só até 320px. */
  @media (max-width: 345px) {
    a {
      font-size: 17px;
    }
  }

  @media (max-width: 480px) {
    padding: 16px;

    .form-div {
      width: 100%;
      padding: 24px 20px;
      border-radius: 16px;
    }
  }
`;
