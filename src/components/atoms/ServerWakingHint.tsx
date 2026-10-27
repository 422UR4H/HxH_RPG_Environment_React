import styled from "styled-components";
import { colors } from "../../styles/tokens";
import useDelayedFlag from "../../hooks/useDelayedFlag";
import { SERVER_WAKING_HINT } from "../../services/serverWake";

// Montado só enquanto o login está pendente (o timer nasce com a montagem). Depois de 3 s sem
// resposta, explica a demora do servidor gratuito. Texto neutro, não é erro.
export default function ServerWakingHint() {
  const slow = useDelayedFlag(3000);
  if (!slow) return null;
  return <StyledHint>{SERVER_WAKING_HINT}</StyledHint>;
}

const StyledHint = styled.p`
  box-sizing: border-box;
  width: 429px;
  margin: 0;
  font-size: min(16px, 4.2vw);
  line-height: 1.35;
  text-align: center;
  color: ${colors.textOnLight};

  @media (max-width: 580px) {
    width: 100%;
  }
`;
