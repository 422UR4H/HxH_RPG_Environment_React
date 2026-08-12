// src/features/match/LobbyConfirmDialog.tsx
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface LobbyConfirmDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LobbyConfirmDialog({
  onCancel,
  onConfirm,
}: LobbyConfirmDialogProps) {
  return (
    <ConfirmOverlay onClick={onCancel}>
      <StyledLobbyDialog onClick={(e) => e.stopPropagation()}>
        <ConfirmText>
          Tem certeza que deseja abrir o lobby desta partida? Os jogadores
          aceitos poderão entrar.
        </ConfirmText>
        <ConfirmButtons>
          <DialogCancelButton onClick={onCancel}>Cancelar</DialogCancelButton>
          <DialogLobbyButton onClick={onConfirm}>Abrir Lobby</DialogLobbyButton>
        </ConfirmButtons>
      </StyledLobbyDialog>
    </ConfirmOverlay>
  );
}

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const StyledLobbyDialog = styled.div`
  background-color: ${colors.surfaceSidebar};
  border-radius: 12px;
  padding: 30px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ConfirmText = styled.p`
  font-family: ${fonts.sans};
  font-size: 20px;
  color: ${colors.textPrimary};
  line-height: 1.5;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseDialogButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 18px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const DialogCancelButton = styled(BaseDialogButton)`
  background-color: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

const DialogLobbyButton = styled(BaseDialogButton)`
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
`;
