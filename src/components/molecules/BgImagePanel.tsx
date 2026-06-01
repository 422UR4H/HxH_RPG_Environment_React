import { useRef, useState } from "react";
import styled from "styled-components";
import imageCompression from "browser-image-compression";
import { colors, fonts } from "../../styles/tokens";
import { IMAGE_PICKER_TIP } from "../../constants/uiStrings";
import { computeCoverFit, deriveGridFromImage } from "../../features/tactical-map/utils/bgFit";
import useToken from "../../hooks/useToken";
import type { BgImage, GridShape } from "../../types/tacticalMap";

// Temporary stub — replaced in Task 9
const usePresignedUpload = () => ({
  getPresignedUrl: async (_token: string, _mapId: string) =>
    ({ uploadUrl: "", publicUrl: "" }),
  uploadToR2: async (_url: string, _blob: Blob): Promise<void> => {},
});

type Props = {
  bg: BgImage;
  grid: GridShape;
  mapId: string;
  onBgChange: (bg: BgImage | null) => void;
  onGridChange: (grid: GridShape) => void;
};

export default function BgImagePanel({ bg, grid, mapId, onBgChange, onGridChange }: Props) {
  const { token } = useToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadToR2, getPresignedUrl } = usePresignedUpload();

  const applyImage = (url: string, naturalWidth: number, naturalHeight: number) => {
    const fit = computeCoverFit(naturalWidth, naturalHeight, grid);
    const newGrid = deriveGridFromImage(naturalWidth, naturalHeight, grid);
    onGridChange(newGrid);
    onBgChange({ ...fit, url });
  };

  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    const img = new Image();
    img.onload = () => applyImage(url, img.naturalWidth, img.naturalHeight);
    img.onerror = () => setUploadError("Não foi possível carregar a imagem desta URL.");
    img.src = url;
  };

  const handleFileSelect = async (file: File) => {
    if (!token) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 4096,
        useWebWorker: true,
      });
      const { uploadUrl, publicUrl } = await getPresignedUrl(token, mapId);
      await uploadToR2(uploadUrl, compressed);
      const blobUrl = URL.createObjectURL(compressed);
      const img = new Image();
      img.onload = () => {
        applyImage(publicUrl, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(blobUrl);
      };
      img.src = blobUrl;
    } catch {
      setUploadError("Não foi possível fazer upload. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFileSelect(file);
  };

  // ── No-image state ──────────────────────────────────────────────────────
  if (!bg) {
    return (
      <Panel>
        <SectionTitle>Imagem de fundo</SectionTitle>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelect(file);
          }}
        />

        <Dropzone
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {isUploading ? "Enviando..." : "Clique ou solte uma imagem aqui"}
        </Dropzone>

        <OrDivider>── ou ──</OrDivider>

        <UrlRow>
          <UrlInput
            type="url"
            placeholder="URL da imagem"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <AddButton type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
            Adicionar
          </AddButton>
        </UrlRow>

        {uploadError && <ErrorText>{uploadError}</ErrorText>}
        <TipText>{IMAGE_PICKER_TIP}</TipText>
      </Panel>
    );
  }

  // ── With-image state — implemented in Task 8 ──────────────────────────
  return (
    <Panel>
      <SectionTitle>Imagem de fundo</SectionTitle>
      <div>Imagem carregada.</div>
    </Panel>
  );
}

// ── Styled components ─────────────────────────────────────────────────────

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  font-family: ${fonts.sans};
`;

const SectionTitle = styled.p`
  font-size: 12px;
  font-weight: 700;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
`;

const Dropzone = styled.div`
  background: ${colors.grayBgDeeper};
  border: 2px dashed ${colors.grayMid};
  border-radius: 8px;
  padding: 32px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  font-size: 13px;
  color: ${colors.textPlaceholderStrong};
  transition: border-color 0.15s;
  &:hover { border-color: ${colors.brandAccent}; }
`;

const OrDivider = styled.p`
  font-size: 12px;
  color: ${colors.textPlaceholder};
  text-align: center;
  margin: 0;
`;

const UrlRow = styled.div`display: flex; gap: 8px;`;

const UrlInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  outline: none;
  &:focus { border-color: ${colors.brandAccentBright}; }
  &::placeholder { color: ${colors.textPlaceholder}; }
`;

const AddButton = styled.button`
  padding: 8px 14px;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
  border: none;
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const TipText = styled.p`
  font-size: 11px;
  color: ${colors.textPlaceholder};
  margin: 0;
  line-height: 1.4;
`;

const ErrorText = styled.p`
  font-size: 12px;
  color: ${colors.danger};
  margin: 0;
`;
