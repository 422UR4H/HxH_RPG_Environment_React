import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

// A casca dos diálogos de confirmação da partida (nova cena, fechar com reação pendente,
// arrumar o tabuleiro): fundo escurecido, cartão central, botões à direita.

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.overlay};
`;

export const Dialog = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 420px;
  width: 90%;
  padding: 24px;
  border-radius: 12px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
`;

export const DialogTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
`;

export const DialogHint = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
`;

export const Buttons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

export const ButtonBase = styled.button`
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const CancelButton = styled(ButtonBase)`
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

export const ConfirmButton = styled(ButtonBase)`
  background: ${colors.dangerDark};
  color: ${colors.textPrimary};
`;
