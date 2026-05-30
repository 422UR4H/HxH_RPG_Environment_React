import { useEffect, useState } from "react";
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
  onSave,
}: BackgroundEditorModalProps) {
  const [draft, setDraft] = useState(initialValue);

  const handleSaveAndClose = () => {
    onSave?.(draft);
    onClose();
  };

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
            <Editor
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva ou cole o background do seu personagem..."
            />
          )}
        </Body>
        <Footer>
          <ActionButton onClick={readOnly ? onClose : handleSaveAndClose}>
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

const Editor = styled.textarea`
  width: 100%;
  min-height: 50vh;
  padding: 14px 16px;
  font-family: "Roboto", sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: ${colors.textPrimary};
  background: ${colors.grayMid};
  border: 2px solid ${colors.grayMidStrong};
  border-radius: 6px;
  resize: vertical;
  tab-size: 4;
  white-space: pre-wrap;
  box-sizing: border-box;

  &::placeholder { color: ${colors.textPlaceholder}; }
  &:focus { outline: none; border-color: ${colors.brandAccentBright}; }
`;
