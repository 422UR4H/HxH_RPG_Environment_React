import styled from "styled-components";
import { colors } from "../../styles/tokens";
import PillSelect from "../../components/molecules/PillSelect";
import { PILL_CHEVRON } from "../../components/molecules/PillSelect.styles";

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
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.brandAccent};
  border: 4px solid ${colors.brandAccent};
  border-radius: 28px;
  padding: 8px min(8cqi, 46px) 8px 16px;
  cursor: pointer;
  background-image: ${PILL_CHEVRON};
  background-repeat: no-repeat;
  background-position: right min(2cqi, 12px) center;
  background-size: min(4.4cqi, 28px);

  /* Fora do anel global (como os campos de texto): o foco é a borda branca. */
  &:active,
  &:focus {
    outline: none;
    border-color: ${colors.textPrimary};
  }
  &:hover {
    filter: brightness(1.1);
  }
`;
