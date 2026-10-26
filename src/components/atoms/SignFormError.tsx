import styled from "styled-components";
import { colors, alpha } from "../../styles/tokens";

interface SignFormErrorProps {
  message: string;
}

// Erro das telas de entrada. Ocupa a coluna dos campos e do botão (429 px; 100% abaixo de 580 px,
// como SignField/BaseButton) e começa o texto no recuo do texto digitado: faixa de 4 px + 12 px de
// padding = borda de 2 px + 14 px de padding do campo. Faixa, não borda inteira: senão parece um campo.
export default function SignFormError({ message }: SignFormErrorProps) {
  return <StyledSignFormError role="alert">{message}</StyledSignFormError>;
}

const StyledSignFormError = styled.div`
  box-sizing: border-box;
  width: 429px;
  padding: 10px 12px;
  border-left: 4px solid ${colors.feedbackInputError};
  background-color: ${alpha(colors.feedbackInputError, 0.08)};

  font-size: min(18px, 4.6vw);
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  color: ${colors.feedbackInputError};

  @media (max-width: 580px) {
    width: 100%;
  }
`;
