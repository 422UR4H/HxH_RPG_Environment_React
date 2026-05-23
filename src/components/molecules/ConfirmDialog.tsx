import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "primary";
  confirmBackground?: string;
  confirmTextColor?: string;
  dialogBackground?: string;
  cancelBackground?: string;
  cancelBorderColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  confirmLabel,
  confirmVariant = "primary",
  confirmBackground,
  confirmTextColor,
  dialogBackground,
  cancelBackground,
  cancelBorderColor,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Overlay onClick={onCancel}>
      <Dialog $bg={dialogBackground} onClick={(e) => e.stopPropagation()}>
        <Message>{message}</Message>
        <Buttons>
          <CancelButton $bg={cancelBackground} $border={cancelBorderColor} onClick={onCancel}>
            Cancelar
          </CancelButton>
          <ActionButton
            $variant={confirmVariant}
            $bg={confirmBackground}
            $color={confirmTextColor}
            onClick={onConfirm}
          >
            {confirmLabel}
          </ActionButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Dialog = styled.div<{ $bg?: string }>`
  background-color: ${({ $bg }) => $bg ?? colors.surfaceSidebar};
  border-radius: 12px;
  padding: 30px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Message = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 20px;
  color: ${colors.textPrimary};
  line-height: 1.5;
`;

const Buttons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 18px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const CancelButton = styled(BaseButton)<{ $bg?: string; $border?: string }>`
  background-color: ${({ $bg }) => $bg ?? "transparent"};
  border: 1px solid ${({ $border }) => $border ?? colors.textPrimary};
  color: ${colors.textPrimary};
`;

const ActionButton = styled(BaseButton)<{
  $variant: "danger" | "primary";
  $bg?: string;
  $color?: string;
}>`
  background: ${({ $bg, $variant }) =>
    $bg ?? ($variant === "danger" ? colors.dangerDark : colors.brandAccent)};
  color: ${({ $color }) => $color ?? colors.textPrimary};
`;
