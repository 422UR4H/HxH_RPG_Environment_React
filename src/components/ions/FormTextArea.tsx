import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { fieldFontSize } from "../../styles/formScale";

const FormTextArea = styled.textarea<{ $resize?: string }>`
  padding: 12px 16px;
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  ${fieldFontSize}
  resize: ${({ $resize }) => $resize || "vertical"};

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }
`;

export default FormTextArea;
