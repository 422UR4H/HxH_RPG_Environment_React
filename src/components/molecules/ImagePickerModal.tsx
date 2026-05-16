// src/components/molecules/ImagePickerModal.tsx
import { useRef, useState } from "react";
import { Cropper, CircleStencil, RectangleStencil } from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";
import type { CropperRef } from "react-advanced-cropper";
import imageCompression from "browser-image-compression";
import styled from "styled-components";

export type ImageType = "avatar" | "cover";

interface ImagePickerModalProps {
  type: ImageType;
  onConfirm: (blob: Blob | null, url: string | null) => void;
  onClose: () => void;
}

type Mode = "upload" | "url";

export default function ImagePickerModal({
  type,
  onConfirm,
  onClose,
}: ImagePickerModalProps) {
  const [mode, setMode] = useState<Mode>("upload");
  const [urlInput, setUrlInput] = useState("");
  const [, setPendingBlob] = useState<Blob | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [pendingModeSwitch, setPendingModeSwitch] = useState<Mode | null>(null);
  const cropperRef = useRef<CropperRef>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPendingContent = mode === "upload" ? imageSrc !== null : urlInput.trim() !== "";

  const handleModeClick = (next: Mode) => {
    if (next === mode) return;
    if (hasPendingContent) {
      setPendingModeSwitch(next);
      setShowOverwriteWarning(true);
    } else {
      setMode(next);
    }
  };

  const confirmModeSwitch = () => {
    if (!pendingModeSwitch) return;
    setPendingBlob(null);
    setUrlInput("");
    setMode(pendingModeSwitch);
    setPendingModeSwitch(null);
    setShowOverwriteWarning(false);
  };

  const cancelModeSwitch = () => {
    setPendingModeSwitch(null);
    setShowOverwriteWarning(false);
  };

  const handleConfirm = async () => {
    if (mode === "url") {
      if (!urlInput.trim()) return;
      onConfirm(null, urlInput.trim());
      return;
    }
    if (!cropperRef.current || !imageSrc) return;
    setIsCompressing(true);
    try {
      const canvas = cropperRef.current.getCanvas();
      if (!canvas) return;
      const rawBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas empty"))), "image/webp", 0.9)
      );
      const maxDimension = type === "avatar" ? 512 : 1280;
      const compressed = await imageCompression(new File([rawBlob], "image.webp", { type: "image/webp" }), {
        maxWidthOrHeight: maxDimension,
        fileType: "image/webp",
        useWebWorker: true,
      });
      onConfirm(compressed, null);
    } finally {
      setIsCompressing(false);
    }
  };

  const aspectRatio = type === "cover" ? "2.5 / 1" : "1 / 1";
  const borderRadius = type === "avatar" ? "50%" : "8px";

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{type === "avatar" ? "Adicionar Avatar" : "Adicionar Capa"}</ModalTitle>
        <Subtitle>Escolha <strong>uma</strong> forma de adicionar a imagem — upload ou link</Subtitle>

        <ModeToggle>
          <ModeButton $active={mode === "upload"} onClick={() => handleModeClick("upload")}>
            📁 Upload arquivo
          </ModeButton>
          <ModeButton $active={mode === "url"} onClick={() => handleModeClick("url")}>
            🔗 Colar link
          </ModeButton>
        </ModeToggle>

        {showOverwriteWarning && (
          <OverwriteWarning>
            <WarningText>
              ⚠️ Trocar de modo irá descartar o conteúdo atual. Deseja continuar?
            </WarningText>
            <WarningActions>
              <WarningButton onClick={cancelModeSwitch}>Manter</WarningButton>
              <DiscardButton onClick={confirmModeSwitch}>Descartar e trocar</DiscardButton>
            </WarningActions>
          </OverwriteWarning>
        )}

        {mode === "url" ? (
          <UrlSection>
            <UrlInput
              type="url"
              placeholder="Cole a URL da imagem aqui"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            {urlInput && (
              <>
                <PreviewLabel>Preview</PreviewLabel>
                <PreviewContainer $aspectRatio={aspectRatio} $borderRadius={borderRadius}>
                  <PreviewImage src={urlInput} alt="preview" />
                </PreviewContainer>
              </>
            )}
          </UrlSection>
        ) : (
          <UploadSection>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setImageSrc(reader.result as string);
                reader.readAsDataURL(file);
                setPendingBlob(null);
              }}
            />
            {!imageSrc ? (
              <DropZone onClick={() => fileInputRef.current?.click()}>
                <DropZoneText>Clique para selecionar uma imagem</DropZoneText>
              </DropZone>
            ) : (
              <CropArea>
                <Cropper
                  ref={cropperRef}
                  src={imageSrc}
                  stencilComponent={type === "avatar" ? CircleStencil : RectangleStencil}
                  stencilProps={type === "cover" ? { aspectRatio: 2.5 } : undefined}
                  style={{ height: 280 }}
                />
                <CropHint>Arraste para reposicionar · Use o scroll para zoom</CropHint>
              </CropArea>
            )}
          </UploadSection>
        )}

        <ModalActions>
          <CancelButton onClick={onClose}>Cancelar</CancelButton>
          <ConfirmButton onClick={handleConfirm} disabled={!hasPendingContent || isCompressing}>
            {isCompressing ? "Processando..." : "Confirmar"}
          </ConfirmButton>
        </ModalActions>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #2a2a2a;
  border-radius: 12px;
  padding: 28px;
  width: min(560px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModalTitle = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  margin: 0;
`;

const Subtitle = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 0.85rem;
  color: #aaa;
  margin: 0;
  text-align: center;
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px;
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? "600" : "400")};
  color: ${({ $active }) => ($active ? "white" : "#aaa")};
  background: ${({ $active }) => ($active ? "#107135" : "transparent")};
  border: 2px solid ${({ $active }) => ($active ? "#107135" : "#555")};
  border-radius: 6px;
  cursor: pointer;
`;

const OverwriteWarning = styled.div`
  background: #3a2a00;
  border: 1px solid #a07000;
  border-radius: 6px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const WarningText = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  color: #ffc107;
  margin: 0;
`;

const WarningActions = styled.div`display: flex; gap: 8px;`;

const WarningButton = styled.button`
  padding: 6px 14px;
  background: transparent;
  color: #aaa;
  border: 1px solid #555;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
`;

const DiscardButton = styled(WarningButton)`
  background: #a07000;
  color: white;
  border-color: #a07000;
`;

const UrlSection = styled.div`display: flex; flex-direction: column; gap: 10px;`;

const UrlInput = styled.input`
  padding: 10px 14px;
  background: #1a1a1a;
  border: 2px solid #555;
  border-radius: 6px;
  color: white;
  font-family: "Roboto", sans-serif;
  font-size: 0.9rem;
  &:focus { outline: none; border-color: #107135; }
`;

const PreviewLabel = styled.p`font-family: "Roboto", sans-serif; font-size: 0.8rem; color: #888; margin: 0;`;

const PreviewContainer = styled.div<{ $aspectRatio: string; $borderRadius: string }>`
  aspect-ratio: ${({ $aspectRatio }) => $aspectRatio};
  border-radius: ${({ $borderRadius }) => $borderRadius};
  overflow: hidden;
  border: 2px dashed #555;
`;

const PreviewImage = styled.img`width: 100%; height: 100%; object-fit: cover;`;

const UploadSection = styled.div`display: flex; flex-direction: column; gap: 10px;`;

const DropZone = styled.div`
  background: #1a1a1a;
  border: 2px dashed #555;
  border-radius: 8px;
  padding: 48px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { border-color: #107135; }
`;

const DropZoneText = styled.p`color: #666; font-family: "Roboto", sans-serif; font-size: 0.9rem; margin: 0;`;

const CropArea = styled.div`display: flex; flex-direction: column; gap: 8px;`;

const CropHint = styled.p`color: #666; font-family: "Roboto", sans-serif; font-size: 0.75rem; text-align: center; margin: 0;`;

const ModalActions = styled.div`display: flex; justify-content: space-between;`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: transparent;
  color: #aaa;
  border: 2px solid #555;
  border-radius: 6px;
  cursor: pointer;
  font-family: "Roboto", sans-serif;
`;

const ConfirmButton = styled.button`
  padding: 10px 24px;
  background: #107135;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: "Roboto", sans-serif;
  font-weight: 600;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
