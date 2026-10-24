import { useNavigate } from "react-router-dom";
import styled from "styled-components";
// import backArrow from "../../assets/icons/setavoltarsemponta.svg"
import backArrow from "../../assets/icons/setavoltarcomponta.svg";
import { useNavGuard } from "../../contexts/NavGuardContext";

export default function BackButton() {
  const navigate = useNavigate();
  const { confirmNavigation } = useNavGuard();

  const handleClick = async () => {
    if (await confirmNavigation()) navigate(-1);
  };

  return (
    <StyledBackButton onClick={handleClick}>
      <Arrow src={backArrow} alt="Voltar" />
    </StyledBackButton>
  );
}

const StyledBackButton = styled.div`
  position: fixed;
  z-index: 10;
  /* 12 px é múltiplo de 4: pixel físico inteiro nas densidades 1; 1,25; 1,5; 1,75 e 2.
     Com 10 px a seta caía em meio pixel em 1,25 e 1,75 e saía borrada (o hover a redesenhava nítida). */
  left: min(12px, 1.8vw);
  /* left: 0px; */
  top: min(12px, 1.8vw);

  cursor: pointer;
  display: inline-block;

  /* Remove any default styling that could create a "box" */
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  outline: none;

  /* Ensure the clickable area matches exactly the icon size */
  width: fit-content;
  height: fit-content;
`;

const Arrow = styled.img`
  /* 136 px → 78,7 px de altura, a mesma da logo (grade do header). */
  width: min(136px, 20.3vw);
  height: auto;
  display: block;
  object-fit: contain;
  border: none;
  outline: none;

  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
