import styled from "styled-components";
import { iconFxTransition } from "../../styles/iconButtonFx";
import closeIcon from "../../assets/icons/x-red.svg";

// O ícone é cópia recolorida de `x.svg` (desenho do designer, mantido no repositório): regere-o se o original mudar.
const CloseButton = styled.img.attrs({
  src: closeIcon,
  alt: "Fechar",
})`
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: block;
  opacity: 0.85;
  transition: opacity 0.15s, ${iconFxTransition};
  -webkit-user-select: none;

  &:hover {
    opacity: 1;
  }
`;

export default CloseButton;
