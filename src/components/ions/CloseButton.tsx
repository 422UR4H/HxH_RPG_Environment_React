import styled from "styled-components";
import { iconFxTransition } from "../../styles/iconButtonFx";
import closeIcon from "../../assets/icons/x-red.svg";

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
