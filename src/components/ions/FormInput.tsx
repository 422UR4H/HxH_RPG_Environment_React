import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

const FormInput = styled.input`
  font-family: ${fonts.sans};
  padding: 12px 16px;
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-size: 24px;

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }
`;

export default FormInput;
