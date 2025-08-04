import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import Logo from "../ions/Logo";

export default function LogoButton() {
  const navigate = useNavigate();

  return (
    <StyledLogoButton onClick={() => navigate("/")}>
      <Logo />
    </StyledLogoButton>
  );
}

const StyledLogoButton = styled.div`
  cursor: pointer;
  display: inline-block;

  /* Remove any default styling that could create a "box" */
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  outline: none;

  /* Ensure the clickable area matches exactly the logo size */
  width: fit-content;
  height: fit-content;

  img {
    /* width: min(200px, 28vw); */
    width: min(180px, 28vw);
    /* width: min(180px, 28%); */
    display: block;
    /* border: none;
    outline: none; */

    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.05);
      filter: brightness(1.1);
    }
    &:active {
      transform: scale(0.98);
    }
  }
`;
