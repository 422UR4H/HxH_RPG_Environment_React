import { styled } from "styled-components";
import { type ReactNode } from "react";
import Logo from "../ions/Logo";
import RisingClouds from "../atoms/RisingClouds";
import { colors, gradients } from "../../styles/tokens";

interface SignPagesTemplateProps {
  children: ReactNode;
}

export default function SignPagesTemplate({
  children,
}: SignPagesTemplateProps) {
  return (
    <StyledSignTemplates>
      <RisingClouds />
      <div className="sign-column">
        <SignLogo />
        <div className="form-div">{children}</div>
      </div>
    </StyledSignTemplates>
  );
}

// Mesma largura do cartão (a coluna a define): a logo fica sobre o fundo azul, acima dele.
const SignLogo = styled(Logo)`
  && {
    width: 100%;
    flex-shrink: 0;
  }
`;

export const StyledSignTemplates = styled.div`
  background: ${gradients.signBg};
  /* Contexto de empilhamento: as nuvens (z-index -1) ficam entre o fundo e o cartão. */
  isolation: isolate;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 30px;

  .sign-column {
    width: 100%;
    max-width: 535px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
  }

  .form-div {
    /* O dourado do anel global some no branco do cartão. */
    --focus-ring: ${colors.actionHighlightOnLight};
    background-color: ${colors.textPrimary};
    width: 100%;
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

    .sign-column {
      gap: 20px;
    }

    .form-div {
      padding: 24px 20px;
      border-radius: 16px;
    }
  }
`;
