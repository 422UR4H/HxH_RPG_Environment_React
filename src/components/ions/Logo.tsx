import hxhLogo from "../../assets/images/hxh-logo.avif";
import styled from "styled-components";

export default function Logo() {
  return <StyledLogo src={hxhLogo} alt="HxH RPG System - Home" />;
}

const StyledLogo = styled.img`
  width: 60%;
  height: auto;
  object-fit: contain;
`;
