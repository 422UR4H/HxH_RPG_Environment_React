import { useEffect } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import DescriptionMarkdown from "./DescriptionMarkdown";

interface BackgroundEditorModalProps {
  initialValue: string;
  readOnly: boolean;
  onClose: () => void;
  onSave?: (value: string) => void;
}

export default function BackgroundEditorModal({
  initialValue,
  readOnly,
  onClose,
}: BackgroundEditorModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Background do personagem</Title>
        <Body>
          {readOnly ? (
            <DescriptionMarkdown source={initialValue} />
          ) : (
            <p>edit mode placeholder</p>
          )}
        </Body>
        <Footer>
          <ActionButton onClick={onClose}>
            {readOnly ? "Fechar" : "Salvar e Fechar"}
          </ActionButton>
        </Footer>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${colors.grayBgModal};
  border-radius: 12px;
  padding: 28px;
  width: min(900px, 92vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Title = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0;
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 50vh;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  padding: 10px 24px;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  font-size: 0.95rem;

  &:hover { filter: brightness(1.1); }
`;
