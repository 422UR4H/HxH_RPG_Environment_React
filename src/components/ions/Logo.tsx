import sxsLogo from "../../assets/images/sxs-logo.svg";
import styled from "styled-components";

export default function Logo() {
  return <StyledLogo src={sxsLogo} alt="System X System" />;
}

const StyledLogo = styled.img`
  width: 60%;
  height: auto;
  object-fit: contain;
`;
