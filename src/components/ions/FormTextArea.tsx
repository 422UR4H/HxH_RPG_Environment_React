import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

const FormTextArea = styled.textarea<{ $resize?: string }>`
  font-family: ${fonts.sans};
  padding: 12px 16px;
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-size: 24px;
  resize: ${({ $resize }) => $resize || "vertical"};

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }
`;

export default FormTextArea;
