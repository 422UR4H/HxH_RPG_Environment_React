import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface SignFormErrorProps {
  message: string;
}

// Erro das telas de entrada. Ocupa a coluna dos campos e do botão (429 px; 100% abaixo de 580 px,
// como BaseInput/BaseButton) e começa o texto no recuo do texto digitado: faixa de 4 px + 14 px de
// padding = borda de 4 px + 14 px de padding do campo. Faixa, não borda inteira: senão parece um campo.
export default function SignFormError({ message }: SignFormErrorProps) {
  return <StyledSignFormError role="alert">{message}</StyledSignFormError>;
}

const StyledSignFormError = styled.div`
  box-sizing: border-box;
  width: 429px;
  padding: 10px 14px;
  border-left: 4px solid ${colors.redInputError};
  background-color: ${colors.redInputError}14;

  font-family: ${fonts.sans};
  font-size: min(18px, 4.6vw);
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  color: ${colors.redInputError};

  @media (max-width: 580px) {
    width: 100%;
  }
`;
