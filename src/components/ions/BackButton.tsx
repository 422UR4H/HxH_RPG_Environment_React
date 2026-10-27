import { useNavigate } from "react-router-dom";
import styled, { css } from "styled-components";
// import backArrow from "../../assets/icons/setavoltarsemponta.svg"
import backArrow from "../../assets/icons/setavoltarcomponta.svg";
import { useNavGuard } from "../../contexts/NavGuardContext";
import { alpha, colors } from "../../styles/tokens";

export default function BackButton() {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavGuard();

  const handleClick = async () => {
    if (await confirmNavigation()) navigate(-1);
  };

  return (
    <StyledBackButton type="button" onClick={handleClick}>
      <Arrow src={backArrow} alt="Voltar" />
    </StyledBackButton>
  );
}

/* Zoom: aparece no hover e no foco do teclado. */
const lit = css`
  transform: scale(1.05);
`;

/* Halo dourado: só no hover. Duas camadas, um núcleo curto e uma luz mais larga. No foco
   quem sinaliza é o anel do botão; halo ali seria um segundo indicador. */
const halo = css`
  filter: drop-shadow(0 0 4px ${alpha(colors.actionHighlight, 0.9)}) drop-shadow(0 0 10px ${alpha(colors.actionHighlight, 0.5)});
`;

const StyledBackButton = styled.button`
  position: fixed;
  z-index: 10;
  /* 12 px é múltiplo de 4: pixel físico inteiro nas densidades 1; 1,25; 1,5; 1,75 e 2.
     Com 10 px a seta caía em meio pixel em 1,25 e 1,75 e saía borrada. */
  /* round() em múltiplo de 4 px CSS: em densidades fracionárias (1,5; 2,625; 2,75) o pixel
     físico vira inteiro e a seta não fica borrada. */
  left: round(min(12px, 1.8vw), 4px);
  top: round(min(12px, 1.8vw), 4px);
  /* Camada própria: sem ela o Chrome pode juntar a seta a outro elemento fixo numa camada
     que comece em meio pixel, e o borrão volta. */
  will-change: transform;

  display: block;
  width: fit-content;
  height: fit-content;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 6px;
  background: none;
  cursor: pointer;

  /* Só o afastamento é próprio (5 px; o global tem 3): a seta tem um respiro maior que os outros controles. O contorno e a cor vêm do anel global. */
  &:focus-visible {
    outline-offset: 5px;
  }

  /* Hover só se há mouse ou touchpad: num aparelho só de toque ele fica preso depois do toque. */
  @media (any-hover: hover) {
    &:hover > img {
      ${lit}
      ${halo}
    }
  }
  &:focus-visible > img {
    ${lit}
  }
  &:active > img {
    transform: scale(0.98);
  }
`;

const Arrow = styled.img`
  /* 136 px → 78,7 px de altura, a mesma da logo (grade do header). */
  width: round(min(136px, 20.3vw), 4px);
  height: auto;
  display: block;
  object-fit: contain;
  border: none;
  outline: none;

  transition: transform 0.2s ease, filter 0.2s ease;
`;
