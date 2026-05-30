import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import TurndownService from "turndown";
import { colors } from "../../styles/tokens";
import DescriptionMarkdown from "./DescriptionMarkdown";
import ConfirmDialog from "./ConfirmDialog";

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
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const isDirty = !readOnly && draft !== initialValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (readOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const turndown = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "_",
    });

    const onPaste = (e: ClipboardEvent) => {
      const cd = e.clipboardData;
      if (!cd) return;
      if (!cd.types.includes("text/html")) return;
      const html = cd.getData("text/html");
      if (!html) return;
      e.preventDefault();
      const markdown = turndown.turndown(html);
      const start = textarea.selectionStart ?? draft.length;
      const end = textarea.selectionEnd ?? draft.length;
      setDraft(draft.slice(0, start) + markdown + draft.slice(end));
    };

    textarea.addEventListener("paste", onPaste);
    return () => textarea.removeEventListener("paste", onPaste);
  }, [readOnly, draft]);

  const attemptClose = () => {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      onClose();
    }
  };

  const handleSaveAndClose = () => {
    onSave?.(draft);
    onClose();
  };

  const handleDiscard = () => {
    setShowDiscardPrompt(false);
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showDiscardPrompt) return;
      if (isDirty) {
        setShowDiscardPrompt(true);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, showDiscardPrompt, isDirty]);

  return (
    <Overlay onClick={attemptClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Background do personagem</Title>
        <Body>
          {readOnly ? (
            <ReadOnlyView>
              <DescriptionMarkdown source={initialValue} />
            </ReadOnlyView>
          ) : (
            <>
              <FormattingTip>
                <TipText>
                  💡 Os símbolos <code>**</code>, <code>##</code>, <code>-</code> viram{" "}
                  <strong>negrito</strong>, títulos e listas na visualização.
                  Cole de qualquer editor — convertemos pra você.
                </TipText>
              </FormattingTip>
              <Editor
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escreva ou cole o background do seu personagem..."
              />
            </>
          )}
        </Body>
        <Footer>
          <ActionButton onClick={readOnly ? onClose : handleSaveAndClose}>
            {readOnly ? "Fechar" : "Salvar e Fechar"}
          </ActionButton>
        </Footer>
      </Modal>
      {showDiscardPrompt && (
        <ConfirmDialog
          message="⚠ Descartar alterações no background?"
          confirmLabel="Descartar"
          cancelLabel="Manter editando"
          confirmVariant="danger"
          onConfirm={handleDiscard}
          onCancel={() => setShowDiscardPrompt(false)}
        />
      )}
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

  @media (max-width: 589px) {
    padding: 22px;
  }

  @media (max-width: 360px) {
    gap: 14px;
    padding: 20px 16px;
  }
`;

const Title = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0;

  @media (max-width: 589px) { font-size: 1.2rem; }
  @media (max-width: 360px) { font-size: 1.05rem; }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 50vh;
`;

const Footer = styled.div`
  display: flex;
`;

const ActionButton = styled.button`
  width: 100%;
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

  @media (max-width: 589px) { font-size: 0.9rem; }
`;

const Editor = styled.textarea`
  width: 100%;
  min-height: 50vh;
  padding: 14px 16px;
  font-family: "Roboto", sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: ${colors.textPrimary};
  background: ${colors.grayBgDark};
  border: 2px solid ${colors.grayMidStrong};
  border-radius: 6px;
  resize: vertical;
  tab-size: 4;
  white-space: pre-wrap;
  box-sizing: border-box;

  &::placeholder { color: ${colors.textPlaceholder}; }
  &:focus { outline: none; border-color: ${colors.brandAccentBright}; }
`;

const FormattingTip = styled.div`
  background: ${colors.warningBgDark};
  border: 1px solid ${colors.warningBorder};
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
`;

const TipText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  color: ${colors.warningText};
  line-height: 1.5;
  margin: 0;

  code {
    font-family: "Courier New", monospace;
    background: rgba(0, 0, 0, 0.25);
    padding: 1px 5px;
    border-radius: 3px;
  }

  @media (max-width: 589px) { font-size: 0.8rem; }
  @media (max-width: 360px) { font-size: 0.75rem; }
`;

const ReadOnlyView = styled.div`
  min-height: 50vh;
  padding: 14px 16px;
  background: ${colors.grayBgDark};
  border: 2px solid ${colors.grayMidStrong};
  border-radius: 6px;
  overflow-y: auto;
`;
