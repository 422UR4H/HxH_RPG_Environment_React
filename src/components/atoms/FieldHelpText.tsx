import styled from "styled-components";
import { colors } from "../../styles/tokens";

/** Texto de ajuda sob um campo de formulário (FormField e FormCheckbox). */
const FieldHelpText = styled.p`
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-top: 4px;
  /* O reset global zera a entrelinha; a ajuda quebra em duas linhas no celular. */
  line-height: 1.35;
`;

export default FieldHelpText;
