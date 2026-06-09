import { useState } from "react";
import type { ChangeEvent } from "react";
import styled from "styled-components";
import type { GridShape } from "../../types/tacticalMap";
import { colors, fonts } from "../../styles/tokens";

type Props = {
  grid: GridShape;
  onChange: (grid: GridShape) => void;
  // "Encaixar Grade" — fits the grid to the background image. Owned by the
  // toolbar (shared with the Fundo tab). Disabled when there is no image.
  onRefit?: () => void;
  canRefit?: boolean;
};

type NumField = "cols" | "rows" | "cellSize" | "rotation" | "skewRatio";

export default function GridConfigPanel({ grid, onChange, onRefit, canRefit }: Props) {
  const [drafts, setDrafts] = useState<Partial<Record<NumField, string>>>({});

  const update = (patch: Partial<GridShape>) =>
    onChange({ ...grid, ...patch });

  const handleInt =
    (key: NumField, min: number, max: number) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDrafts((prev) => ({ ...prev, [key]: raw }));
      const v = parseInt(raw, 10);
      if (!isNaN(v) && v >= min && v <= max) update({ [key]: v });
    };

  const inputValue = (key: NumField): string | number =>
    drafts[key] !== undefined ? (drafts[key] as string) : grid[key];

  /* OCULTO POR ORA — Predefinições / Rotação / Perspectiva (ver JSX abaixo).
     Estes helpers só eram usados por esses campos. Reativar junto com eles.

  // Like handleInt but keeps decimals — needed for precise isometric tuning
  // (rotation angle and perspective ratio differ per map).
  const handleFloat =
    (key: NumField, min: number, max: number) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDrafts((prev) => ({ ...prev, [key]: raw }));
      const v = parseFloat(raw);
      if (!isNaN(v) && v >= min && v <= max) update({ [key]: v });
    };

  const fmtDeg = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));
  */

  return (
    <Panel>
      <SectionTitle>Configurar Malha</SectionTitle>

      <Field>
        <FieldLabel>Tipo</FieldLabel>
        <KindRow>
          <KindButton
            type="button"
            $active={grid.kind === "square"}
            data-active={grid.kind === "square"}
            onClick={() => update({ kind: "square" })}
          >
            Quadrada
          </KindButton>
          <KindButton
            type="button"
            $active={grid.kind === "hex"}
            data-active={grid.kind === "hex"}
            onClick={() => update({ kind: "hex" })}
          >
            Hexagonal
          </KindButton>
        </KindRow>
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-cols">Colunas</FieldLabel>
        <NumInput
          id="grid-cols"
          type="number"
          value={inputValue("cols")}
          min={1}
          max={200}
          onChange={handleInt("cols", 1, 200)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-rows">Linhas</FieldLabel>
        <NumInput
          id="grid-rows"
          type="number"
          value={inputValue("rows")}
          min={1}
          max={200}
          onChange={handleInt("rows", 1, 200)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-cell-size">Tamanho (px)</FieldLabel>
        <NumInput
          id="grid-cell-size"
          type="number"
          value={inputValue("cellSize")}
          min={8}
          max={256}
          onChange={handleInt("cellSize", 8, 256)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-color">Cor da malha</FieldLabel>
        <input
          id="grid-color"
          type="color"
          value={grid.color}
          onChange={(e) => update({ color: e.target.value })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-opacity">
          Opacidade ({Math.round(grid.opacity * 100)}%)
        </FieldLabel>
        <OpacityRange
          id="grid-opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={grid.opacity}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
        />
      </Field>

      {/* OCULTO POR ORA — Predefinições, Rotação e Perspectiva não estão
          disponíveis para o usuário ainda. O código permanece funcionando: se
          rotation/skewRatio vierem do backend, o GridLayer os aplica no render.
          Reexpor (e reativar handleFloat/fmtDeg + SkewRow/SkewInput/SkewLabels)
          quando liberar essas features.

      <Field>
        <FieldLabel>Predefinições</FieldLabel>
        <KindRow>
          <KindButton
            type="button"
            $active={grid.rotation === 45 && grid.skewRatio === 0.5}
            onClick={() => update({ rotation: 45, skewRatio: 0.5 })}
          >
            Isométrico
          </KindButton>
          <KindButton
            type="button"
            $active={grid.rotation === 0 && grid.skewRatio === 1.0}
            onClick={() => update({ rotation: 0, skewRatio: 1.0 })}
          >
            Top-down
          </KindButton>
        </KindRow>
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-rotation">
          Rotação ({fmtDeg(grid.rotation)}°)
        </FieldLabel>
        <NumInput
          id="grid-rotation"
          type="number"
          min={-180}
          max={180}
          step={0.1}
          value={inputValue("rotation")}
          onChange={handleFloat("rotation", -180, 180)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="grid-skew">
          Perspectiva (
          {grid.skewRatio === 1
            ? "Top-down"
            : grid.skewRatio <= 0.5
              ? "Isométrico"
              : "Semi-isométrico"}
          )
        </FieldLabel>
        <SkewRow>
          <OpacityRange
            id="grid-skew"
            type="range"
            min={0.3}
            max={1.0}
            step={0.01}
            value={grid.skewRatio}
            onChange={(e) => {
              setDrafts((prev) => ({ ...prev, skewRatio: undefined }));
              update({ skewRatio: parseFloat(e.target.value) });
            }}
          />
          <SkewInput
            type="number"
            aria-label="Valor da perspectiva"
            min={0.3}
            max={1.0}
            step={0.01}
            value={inputValue("skewRatio")}
            onChange={handleFloat("skewRatio", 0.3, 1.0)}
          />
        </SkewRow>
        <SkewLabels>
          <span>Isométrico</span>
          <span>Top-down</span>
        </SkewLabels>
      </Field>
      */}

      <RefitButton
        type="button"
        onClick={() => onRefit?.()}
        disabled={!canRefit}
        title={canRefit ? "Ajusta a grade à imagem de fundo" : "Adicione uma imagem de fundo primeiro"}
      >
        Encaixar Grade
      </RefitButton>
    </Panel>
  );
}

const Panel = styled.div`
  padding: clamp(10px, 4cqi, 16px);
  display: flex;
  flex-direction: column;
  gap: clamp(10px, 3cqi, 16px);
`;

const SectionTitle = styled.h3`
  font-family: ${fonts.sans};
  font-size: clamp(10px, 3cqi, 13px);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${colors.textDisabled};
  margin: 0;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  color: ${colors.textDisabled};
`;

const KindRow = styled.div`
  display: flex;
  gap: 8px;
`;

const KindButton = styled.button<{ $active: boolean }>`
  flex: 1;
  height: max(40px, 8cqi);
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  background: ${({ $active }) => ($active ? colors.brandAccent : "transparent")};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: clamp(11px, 3cqi, 13px);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
  }
`;

const NumInput = styled.input`
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 15px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: clamp(6px, 2cqi, 8px) clamp(8px, 3cqi, 12px);
  outline: none;
  width: 100%;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;

const OpacityRange = styled.input`
  width: 100%;
  accent-color: ${colors.brandAccent};
  cursor: pointer;
`;

const RefitButton = styled.button`
  width: 100%;
  padding: 8px;
  background: transparent;
  color: ${colors.textDisabled};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  font-family: ${fonts.sans};
  font-size: 12px;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${colors.brandAccent};
    color: ${colors.brandAccent};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* OCULTO POR ORA — usados apenas pelo campo Perspectiva (ver JSX comentado).
const SkewRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SkewInput = styled.input`
  width: 64px;
  flex-shrink: 0;
  font-family: ${fonts.sans};
  font-size: clamp(12px, 3.5cqi, 15px);
  color: ${colors.textPrimary};
  background: ${colors.surfaceInput};
  border: 1px solid ${colors.borderInput};
  border-radius: 6px;
  padding: clamp(6px, 2cqi, 8px) clamp(6px, 2cqi, 8px);
  outline: none;

  &:focus {
    border-color: ${colors.brandAccentBright};
  }
`;

const SkewLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-family: ${fonts.sans};
  font-size: 11px;
  color: ${colors.textDisabled};
`;
*/
