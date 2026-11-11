import sxsLogo from "../../assets/images/sxs-logo.svg";
import styled from "styled-components";

interface LogoProps {
  /** Quem precisa de outra largura estiliza `styled(Logo)`; o padrão é 60% do pai. */
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return <StyledLogo className={className} src={sxsLogo} alt="System X System" />;
}

const StyledLogo = styled.img`
  /* round(): largura em pixel físico inteiro nas densidades fracionárias. */
  width: 60%;
  width: round(60%, 4px);
  height: auto;
  object-fit: contain;
`;
