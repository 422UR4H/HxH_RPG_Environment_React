import styled, { css } from "styled-components";
import { colors, alpha } from "../../styles/tokens";

interface SignFormErrorProps {
  message: string;
  // "light": cartão claro do login/cadastro. "dark": formulários sobre a textura clara do mapa.
  tone?: "light" | "dark";
}

// Erro das telas de entrada. Ocupa a coluna dos campos e do botão (429 px; 100% abaixo de 580 px,
// como SignField/BaseButton) e começa o texto no recuo do texto digitado: faixa de 4 px + 14 px de
// padding = borda de 2 px + 16 px de padding do campo. Faixa, não borda inteira: senão parece um campo.
export default function SignFormError({ message, tone = "light" }: SignFormErrorProps) {
  return (
    <StyledSignFormError role="alert" $tone={tone}>
      {message}
    </StyledSignFormError>
  );
}

const lightTone = css`
  width: 429px;
  border-left: 4px solid ${colors.feedbackInputError};
  background-color: ${alpha(colors.feedbackInputError, 0.08)};
  font-size: min(18px, 4.6vw);
  color: ${colors.feedbackInputError};

  @media (max-width: 580px) {
    width: 100%;
  }
`;

const darkTone = css`
  width: 100%;
  margin-bottom: 20px;
  border-left: 4px solid ${colors.feedbackDangerText};
  /* A textura clara do mapa deixava o vermelho em 1,2:1: base escura + tinta de perigo, como no SignNotice. */
  background-color: ${colors.overlayDark};
  background-image: linear-gradient(${alpha(colors.feedbackDanger, 0.16)}, ${alpha(colors.feedbackDanger, 0.16)});
  font-size: 16px;
  color: ${colors.textPrimary};
`;

const StyledSignFormError = styled.div<{ $tone: "light" | "dark" }>`
  box-sizing: border-box;
  padding: 10px 14px;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  ${({ $tone }) => ($tone === "dark" ? darkTone : lightTone)}
`;
