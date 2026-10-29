import { useNavigate } from "react-router-dom";
import styled from "styled-components";
// import backArrow from "../../assets/icons/setavoltarsemponta.svg"
import backArrow from "../../assets/icons/setavoltarcomponta.svg";
import { useNavGuard } from "../../contexts/NavGuardContext";
import { iconButtonFx, iconFxTransition } from "../../styles/iconButtonFx";

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

/* Brilho de 10% permanente (repouso, hover, foco e clique): sem ele a seta parece embaçada até o
   hover. O halo do hover soma a este filtro (ver `iconButtonFx`). */
const backArrowBrightness = "brightness(1.1)";

const StyledBackButton = styled.button`
  position: fixed;
  z-index: 10;
  /* 12 px é múltiplo de 4: pixel físico inteiro nas densidades 1; 1,25; 1,5; 1,75 e 2.
     Com 10 px a seta caía em meio pixel em 1,25 e 1,75 e saía borrada. */
  /* round() em múltiplo de 4 px CSS: em densidades fracionárias (1,5; 2,625; 2,75) o pixel
     físico vira inteiro e a seta não fica borrada. */
  left: min(12px, 1.8vw);
  top: min(12px, 1.8vw);
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

  ${iconButtonFx(1.05, backArrowBrightness)}
`;

const Arrow = styled.img`
  /* 136 px → 78,7 px de altura, a mesma da logo (grade do header). */
  width: min(136px, 20.3vw);
  width: round(min(136px, 20.3vw), 4px);
  height: auto;
  display: block;
  object-fit: contain;
  border: none;
  outline: none;

  filter: ${backArrowBrightness};
  transition: ${iconFxTransition};
`;
