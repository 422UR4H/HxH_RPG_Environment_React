import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { fieldFontSize } from "../../styles/formScale";

const FormInput = styled.input`
  padding: 12px 16px;
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  ${fieldFontSize}

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }

  &::placeholder {
    color: ${colors.textInputPlaceholder};
    opacity: 1; /* o Firefox aplica 0,54 por padrão */
  }

  &[aria-invalid="true"] {
    border-color: ${colors.feedbackDanger};
  }
`;

export default FormInput;
