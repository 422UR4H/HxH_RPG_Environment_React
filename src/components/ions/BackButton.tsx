import { useNavigate } from "react-router-dom";
import styled from "styled-components";
// import backArrow from "../../assets/icons/setavoltarsemponta.svg"
import backArrow from "../../assets/icons/setavoltarcomponta.svg";

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <StyledBackButton onClick={() => navigate(-1)}>
      <Arrow src={backArrow} alt="Back" />
    </StyledBackButton>
  );
}

const StyledBackButton = styled.div`
  position: fixed;
  z-index: 10;
  left: min(10px, 1.6vw);
  /* left: 0px; */
  top: min(10px, 1.6vw);

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
  width: min(140px, 20vw);
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
