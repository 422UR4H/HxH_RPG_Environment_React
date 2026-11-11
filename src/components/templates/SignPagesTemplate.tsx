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

// Mesma largura dos campos e do botão (429 px; abaixo de 580 px de janela eles ocupam a coluna
// interna do cartão, 100% menos o padding lateral de cada breakpoint).
const SignLogo = styled(Logo)`
  && {
    width: 429px;
    flex-shrink: 0;
    /* Primeira linha do grid, colada embaixo: a logo fica fora do cálculo que centraliza o cartão. */
    align-self: end;
    margin-bottom: 30px;
  }

  @media (max-width: 580px) {
    && {
      width: calc(100% - 60px);
    }
  }

  @media (max-width: 480px) {
    && {
      width: calc(100% - 40px);
      margin-bottom: 20px;
    }
  }
`;

export const StyledSignTemplates = styled.div`
  background: ${gradients.signBg};
  /* Contexto de empilhamento: as nuvens (z-index -1) ficam entre o fundo e o cartão. */
  isolation: isolate;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 30px;

  /* Três linhas: logo (1ª, alinhada embaixo), cartão (2ª), vazia (3ª). As duas 1fr centralizam o
     cartão na janela; em tela baixa a 1ª cresce até caber a logo e a página rola sem cortar nada. */
  .sign-column {
    container-type: inline-size;
    width: 100%;
    max-width: 535px;
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    justify-items: center;
  }

  .form-div {
    /* O dourado do anel global some no branco do cartão. */
    --focus-ring: ${colors.actionHighlightOnLight};
    background-color: ${colors.textPrimary};
    width: 100%;
    border-radius: 24px;
    /* Margem superior = lateral: da borda do cartão até a borda do 1º campo (que tem 429 px). */
    padding: calc((100cqi - 429px) / 2) 30px 30px;

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

  /* Campos em 100% da coluna interna: a lateral é o padding do cartão. */
  @media (max-width: 580px) {
    .form-div {
      padding-top: 30px;
    }
  }

  @media (max-width: 480px) {
    padding: 16px;

    .form-div {
      padding: 20px 20px 24px;
      border-radius: 16px;
    }
  }
`;
