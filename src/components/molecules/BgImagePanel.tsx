import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import imageCompression from "browser-image-compression";
import { colors, fonts } from "../../styles/tokens";
import { IMAGE_PICKER_TIP } from "../../constants/uiStrings";
import { computeCoverFit, deriveGridFromImage } from "../../features/tactical-map/utils/bgFit";
import useToken from "../../hooks/useToken";
import { usePresignedUpload } from "../../hooks/usePresignedUpload";
import type { BgImage, GridShape } from "../../types/tacticalMap";

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
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [scaleXPct, setScaleXPct] = useState(100);
  const [aspectLocked, setAspectLocked] = useState(true);
  type NumField = "x" | "y" | "scaleX" | "scaleY" | "rotation";
  const [drafts, setDrafts] = useState<Partial<Record<NumField, string>>>({});
  // Tracks the blob URL created during file upload so we can revoke it on unmount.
  const blobUrlRef = useRef<string | null>(null);
  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const applyImage = (url: string, nw: number, nh: number, r2Url?: string) => {
    setNaturalSize({ w: nw, h: nh });
    const fit = computeCoverFit(nw, nh, grid);
    const newGrid = deriveGridFromImage(nw, nh, grid);
    onGridChange(newGrid);
    onBgChange({ ...fit, url, r2Url });
    setScaleXPct(100);
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
    if (!token) {
      setUploadError("Sessão expirada. Faça login novamente.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 4096,
        useWebWorker: true,
      });
      const { uploadUrl, publicUrl } = await getPresignedUrl(token, mapId);
      await uploadToR2(uploadUrl, compressed);
      // Use a blob URL for display: same-origin, no CORS headers required.
      // The R2 public URL is stored in r2Url and only used when persisting
      // to the server. Without CORS configured on the R2 bucket, Assets.load()
      // would fail on the R2 URL because the browser blocks cross-origin fetch.
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const blobUrl = URL.createObjectURL(compressed);
      blobUrlRef.current = blobUrl;
      const img = new Image();
      img.onload = () => {
        applyImage(blobUrl, img.naturalWidth, img.naturalHeight, publicUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        blobUrlRef.current = null;
        setUploadError("Imagem carregada mas não foi possível processar. Tente novamente.");
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

  // ── With-image state ──────────────────────────────────────────────────
  const handleRefit = () => {
    if (!bg) return;
    const nw = naturalSize?.w ?? bg.width;
    const nh = naturalSize?.h ?? bg.height;
    const fit = computeCoverFit(nw, nh, grid);
    onBgChange({ ...fit, url: bg.url, r2Url: bg.r2Url });
    setScaleXPct(100);
    setDrafts({});
  };

  const originalRatio = naturalSize ? naturalSize.h / naturalSize.w : bg.height / bg.width;

  const draft = (key: NumField, fallback: number): string | number =>
    drafts[key] !== undefined ? (drafts[key] as string) : Math.round(fallback);

  const handlePosXChange = (raw: string) => {
    setDrafts((prev) => ({ ...prev, x: raw }));
    const val = parseInt(raw, 10);
    if (!isNaN(val)) onBgChange({ ...bg, x: val });
  };
  const handlePosYChange = (raw: string) => {
    setDrafts((prev) => ({ ...prev, y: raw }));
    const val = parseInt(raw, 10);
    if (!isNaN(val)) onBgChange({ ...bg, y: val });
  };

  const handleScaleXChange = (raw: string) => {
    setDrafts((prev) => ({ ...prev, scaleX: raw }));
    const pct = parseInt(raw, 10);
    if (isNaN(pct) || pct < 1) return;
    const newW = naturalSize
      ? (naturalSize.w * pct) / 100
      : (bg.width * pct) / scaleXPct;
    if (aspectLocked) {
      onBgChange({ ...bg, width: newW, height: newW * originalRatio });
    } else {
      onBgChange({ ...bg, width: newW });
    }
    setScaleXPct(pct);
  };

  const handleScaleYChange = (raw: string) => {
    setDrafts((prev) => ({ ...prev, scaleY: raw }));
    const pct = parseInt(raw, 10);
    if (isNaN(pct) || pct < 1) return;
    const naturalH = naturalSize?.h ?? bg.height;
    onBgChange({ ...bg, height: (naturalH * pct) / 100 });
  };

  const handleRotationChange = (raw: string) => {
    setDrafts((prev) => ({ ...prev, rotation: raw }));
    const deg = parseInt(raw, 10);
    if (!isNaN(deg)) onBgChange({ ...bg, rotation: deg });
  };

  const handleOpacityChange = (val: number) => onBgChange({ ...bg, opacity: val });

  return (
    <Panel>
      <SectionTitle>Imagem de fundo</SectionTitle>
      <ActionRow>
        <TextButton type="button" onClick={() => onBgChange(null)}>Trocar imagem</TextButton>
        <DangerButton type="button" onClick={() => onBgChange(null)}>Remover</DangerButton>
      </ActionRow>

      <FieldGroup>
        <label htmlFor="bg-pos-x">Pos X</label>
        <NumberInput
          id="bg-pos-x"
          aria-label="Pos X"
          type="number"
          step={1}
          value={draft("x", bg.x)}
          onChange={(e) => handlePosXChange(e.target.value)}
        />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="bg-pos-y">Pos Y</label>
        <NumberInput
          id="bg-pos-y"
          aria-label="Pos Y"
          type="number"
          step={1}
          value={draft("y", bg.y)}
          onChange={(e) => handlePosYChange(e.target.value)}
        />
      </FieldGroup>

      <Divider />

      <LockRow>
        <FieldGroup>
          <label htmlFor="bg-scale-x">Escala X</label>
          <NumberInput
            id="bg-scale-x"
            aria-label="Escala X"
            type="number"
            step={1}
            min={1}
            value={draft("scaleX", scaleXPct)}
            onChange={(e) => handleScaleXChange(e.target.value)}
          />
        </FieldGroup>
        <LockButton
          type="button"
          onClick={() => setAspectLocked((v) => !v)}
          title={aspectLocked ? "Destravar proporção" : "Travar proporção"}
        >
          {aspectLocked ? "🔒" : "🔓"}
        </LockButton>
        <FieldGroup>
          <label htmlFor="bg-scale-y">Escala Y</label>
          <NumberInput
            id="bg-scale-y"
            aria-label="Escala Y"
            type="number"
            step={1}
            min={1}
            disabled={aspectLocked}
            value={draft(
              "scaleY",
              aspectLocked
                ? scaleXPct
                : (bg.height / (naturalSize?.h ?? bg.height)) * 100,
            )}
            onChange={(e) => handleScaleYChange(e.target.value)}
          />
        </FieldGroup>
      </LockRow>

      <FieldGroup>
        <label htmlFor="bg-rotation">Rotação</label>
        <NumberInput
          id="bg-rotation"
          aria-label="Rotação"
          type="number"
          step={1}
          min={-180}
          max={180}
          value={draft("rotation", bg.rotation)}
          onChange={(e) => handleRotationChange(e.target.value)}
        />
      </FieldGroup>
      <FieldGroup>
        <label htmlFor="bg-opacity">Opacidade</label>
        <SliderInput
          id="bg-opacity"
          aria-label="Opacidade"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={bg.opacity}
          onChange={(e) => handleOpacityChange(Number(e.target.value))}
        />
      </FieldGroup>

      <RefitButton type="button" onClick={handleRefit}>Encaixar no grid</RefitButton>
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

const ActionRow = styled.div`display: flex; gap: 8px;`;

const TextButton = styled.button`
  flex: 1;
  padding: 7px 12px;
  background: transparent;
  color: ${colors.brandAccent};
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const DangerButton = styled(TextButton)`
  color: ${colors.danger};
  border-color: ${colors.danger};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
  flex: 1;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  outline: none;
  &:disabled { opacity: 0.4; }
`;

const LockRow = styled.div`display: flex; align-items: flex-end; gap: 4px;`;

const LockButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  align-self: flex-end;
  margin-bottom: 6px;
`;

const SliderInput = styled.input`width: 100%;`;

const Divider = styled.hr`border-color: ${colors.borderInput}; margin: 4px 0;`;

const RefitButton = styled.button`
  width: 100%;
  padding: 8px;
  background: transparent;
  color: ${colors.textPlaceholderStrong};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  cursor: pointer;
  &:hover { border-color: ${colors.brandAccent}; color: ${colors.brandAccent}; }
`;
