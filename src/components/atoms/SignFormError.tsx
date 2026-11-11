import styled, { css } from "styled-components";
import { colors, alpha } from "../../styles/tokens";
import { errorBox } from "../../styles/errorBox";

interface SignFormErrorProps {
  message: string;
  // "light": cartão claro do login/cadastro. "dark": formulários sobre a textura clara do mapa.
  tone?: "light" | "dark";
}

// Erro das telas de entrada. Ocupa a coluna dos campos e do botão (429 px; 100% abaixo de 580 px,
// como SignField/BaseButton) e começa o texto no recuo do texto digitado: faixa de 4 px + 16 px de
// padding = borda de 4 px + 16 px de padding do campo (20 px). Faixa, não borda inteira: senão parece
// um campo. O tom escuro (formulários sobre o mapa) usa a caixa de erro padrão (`errorBox`): precisa saltar da página.
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
  padding-left: 16px;
  font-size: min(18px, 4.6vw);
  color: ${colors.feedbackInputError};

  @media (max-width: 580px) {
    width: 100%;
  }
`;

const darkTone = css`
  width: 100%;
  margin-bottom: 20px;
  ${errorBox}
  font-size: 18px;
`;

const StyledSignFormError = styled.div<{ $tone: "light" | "dark" }>`
  box-sizing: border-box;
  padding: 10px 14px;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  ${({ $tone }) => ($tone === "dark" ? darkTone : lightTone)}
`;
