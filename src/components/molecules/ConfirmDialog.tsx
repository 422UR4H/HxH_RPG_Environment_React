import styled from "styled-components";

interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Message>{message}</Message>
        <Buttons>
          <CancelButton onClick={onCancel}>Cancelar</CancelButton>
          <ActionButton $variant={confirmVariant} onClick={onConfirm}>
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const Dialog = styled.div`
  background-color: #2d2215;
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
  color: white;
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

const CancelButton = styled(BaseButton)`
  background-color: transparent;
  border: 1px solid white;
  color: white;
`;

const ActionButton = styled(BaseButton)<{ $variant: "danger" | "primary" }>`
  background-color: ${({ $variant }) =>
    $variant === "danger" ? "#c0392b" : "#107135"};
  color: white;
`;
