import { useNavigate } from "react-router-dom";
import styled from "styled-components";
// import backArrow from "../../assets/icons/setavoltarsemponta.svg"
import backArrow from "../../assets/icons/setavoltarcomponta.svg";

interface BackButtonProps {
  to: string;
}

export default function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <StyledBackButton onClick={() => navigate(to)}>
      <Arrow src={backArrow} alt="Back" />
    </StyledBackButton>
  );
}

const StyledBackButton = styled.div`
  position: fixed;
  z-index: 10;
  left: 10px;
  top: 10px;
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

  /* Remove any potential borders or outlines */
  border: none;
  outline: none;

  /* Smooth transition for any hover effects */
  transition: opacity 0.2s ease;

  /* Optional hover effect */
  &:hover {
    opacity: 0.8;
  }
`;
