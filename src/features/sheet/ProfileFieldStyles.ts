import styled from "styled-components";
import { colors } from "../../styles/tokens";

// Campo do perfil: rótulo acima do valor/campo. Usado por ProfileDetails (leitura e edição) e ProfileInputs.
export const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const DetailLabel = styled.span`
  font-size: min(3.4cqi, 24px);
  color: ${colors.textInputDisabled};
  font-weight: 500;

  @media (max-width: 609px) {
    font-size: 4cqi;
  }
`;
