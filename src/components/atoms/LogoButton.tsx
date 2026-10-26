import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Logo from "../ions/Logo";
import { useNavGuard } from "../../contexts/NavGuardContext";
import { colors } from "../../styles/tokens";

export default function LogoButton() {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavGuard();

  // Ctrl/Cmd/Shift/Alt+clique e botão do meio ficam com o navegador (nova aba): a página atual não sai.
  // O clique simples passa pela trava de navegação antes de sair.
  const handleClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (await confirmNavigation()) navigate("/");
  };

  return (
    <StyledLogoButton to="/" onClick={handleClick}>
      <Logo />
    </StyledLogoButton>
  );
}

const StyledLogoButton = styled(Link)`
  display: block;
  width: fit-content;
  height: fit-content;
  border-radius: 6px;

  &:focus-visible {
    outline: 2px solid ${colors.actionHighlight};
    outline-offset: 5px;
  }

  img {
    /* width: min(200px, 28vw); */
    /* 188 px → 78 px de altura, a da logo antiga: logos de proporção diferente se igualam pela altura. */
    width: min(188px, 28vw);
    /* width: min(180px, 28%); */
    display: block;
    /* border: none;
    outline: none; */

    /* Só o zoom: o brightness() antigo dava a impressão de ficar mais nítida, e um halo aqui
       vazaria para os vãos entre as letras. */
    transition: transform 0.2s ease;
  }

  /* Hover só se há mouse ou touchpad: num aparelho só de toque ele fica preso depois do toque. */
  @media (any-hover: hover) {
    &:hover img {
      transform: scale(1.05);
    }
  }
  &:focus-visible img {
    transform: scale(1.05);
  }
  &:active img {
    transform: scale(0.98);
  }
`;
