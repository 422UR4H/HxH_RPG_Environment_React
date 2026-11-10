import { useEffect, useRef } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";

interface InfoDialogProps {
  title: string;
  message: string;
  closeLabel?: string;
  onClose: () => void;
}

// Aviso que o jogador precisa ler: mesmo overlay e visual do ConfirmDialog, um único botão.
// Esc e clique fora fecham; o foco começa no botão.
export default function InfoDialog({ title, message, closeLabel = "Entendi", onClose }: InfoDialogProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <Overlay onClick={onClose}>
      <Dialog role="dialog" aria-modal="true" aria-labelledby="info-dialog-title" onClick={(e) => e.stopPropagation()}>
        <Title id="info-dialog-title">{title}</Title>
        <Message>{message}</Message>
        <Buttons>
          <CloseButton ref={buttonRef} onClick={onClose}>
            {closeLabel}
          </CloseButton>
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

const Dialog = styled.div`
  background-color: ${colors.surfaceSidebar};
  border-radius: 12px;
  padding: 30px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  color: ${colors.textPrimary};
  line-height: 1.3;
`;

const Message = styled.p`
  font-size: 20px;
  color: ${colors.textPrimary};
  line-height: 1.5;
`;

const Buttons = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
  font-size: 18px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};

  &:hover {
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;
