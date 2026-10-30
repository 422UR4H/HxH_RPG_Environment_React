import styled from "styled-components";
import { colors } from "../../styles/tokens";
import PillSelect from "../../components/molecules/PillSelect";
import { pillLook } from "../../components/molecules/PillSelect.styles";

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

// Pílula verde dos selects do perfil (aniversário, alinhamento) e dos slots de proficiência.
// Só o desenho da pílula fechada; a lógica e a lista aberta vêm do PillSelect.
export const ProfilePillSelect = styled(PillSelect)`
  ${pillLook}
  font-size: min(3.8cqi, 28px);
  border-width: 4px;
  border-radius: 28px;
  padding: 8px min(8cqi, 46px) 8px 16px;
  background-position: right min(2cqi, 12px) center;
  background-size: min(4.4cqi, 28px);
`;
