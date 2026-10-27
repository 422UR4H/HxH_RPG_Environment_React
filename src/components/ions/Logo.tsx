import sxsLogo from "../../assets/images/sxs-logo.svg";
import styled from "styled-components";

export default function Logo() {
  return <StyledLogo src={sxsLogo} alt="System X System" />;
}

const StyledLogo = styled.img`
  /* round(): largura em pixel físico inteiro nas densidades fracionárias. */
  width: round(60%, 4px);
  height: auto;
  object-fit: contain;
`;
