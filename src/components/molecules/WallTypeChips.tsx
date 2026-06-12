import styled from "styled-components";
import { fonts } from "../../styles/tokens";
import type { WallMaterial, WallType } from "../../types/tacticalMap";

type Props = {
  activeType: WallType | null;
  activeMaterial: WallMaterial;
  drawMode: boolean;
  onTypeChange: (t: WallType | null) => void;
  onMaterialChange: (m: WallMaterial) => void;
};

const WALL_TYPES: { value: WallType; label: string }[] = [
  { value: "wall",        label: "Parede" },
  { value: "door",        label: "Porta" },
  { value: "window",      label: "Janela" },
  { value: "secret_door", label: "P. Secreta" },
  { value: "terrain",     label: "Terreno" },
];

const MATERIALS: { value: WallMaterial; label: string }[] = [
  { value: "stone",   label: "Pedra" },
  { value: "wood",    label: "Madeira" },
  { value: "iron",    label: "Ferro" },
  { value: "magical", label: "Mágica" },
];

const TYPE_LABELS: Record<WallType, string> = {
  wall: "Parede", door: "Porta", window: "Janela",
  secret_door: "P. Secreta", terrain: "Terreno",
};

export default function WallTypeChips({
  activeType, activeMaterial, drawMode, onTypeChange, onMaterialChange,
}: Props) {
  return (
    <Container>
      <ModeBadge $active={drawMode}>
        <ModeDot $active={drawMode} />
        <ModeLabel>
          {drawMode && activeType
            ? `Desenhando · ${TYPE_LABELS[activeType]}`
            : "Selecionar"}
        </ModeLabel>
        {drawMode && <EscHint>Esc para sair</EscHint>}
      </ModeBadge>

      <Section>
        <SectionLabel>Tipo de parede</SectionLabel>
        <ChipRow>
          {WALL_TYPES.map(({ value, label }) => (
            <Chip
              key={value}
              type="button"
              $active={activeType === value}
              onClick={() => onTypeChange(activeType === value ? null : value)}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
        <Hint>
          {drawMode
            ? "Clique no tipo ativo para sair do modo Desenho"
            : "Clique em um tipo para começar a desenhar"}
        </Hint>
      </Section>

      {drawMode && (
        <Section>
          <SectionLabel>Material</SectionLabel>
          <ChipRow>
            {MATERIALS.map(({ value, label }) => (
              <Chip
                key={value}
                type="button"
                $active={activeMaterial === value}
                onClick={() => onMaterialChange(value)}
              >
                {label}
              </Chip>
            ))}
          </ChipRow>
        </Section>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 12px;
`;
const ModeBadge = styled.div<{ $active: boolean }>`
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 6px;
  background: #0f172a;
  border: 1px solid ${({ $active }) => $active ? "#f59e0b" : "#334155"};
`;
const ModeDot = styled.div<{ $active: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $active }) => $active ? "#f59e0b" : "#94a3b8"};
  ${({ $active }) => $active && "box-shadow: 0 0 6px #f59e0b;"}
`;
const ModeLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: inherit; flex: 1;
`;
const EscHint = styled.span`
  font-family: ${fonts.sans};
  font-size: 10px; color: #475569;
`;
const Section = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const SectionLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase; letter-spacing: 0.05em;
`;
const ChipRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;
const Chip = styled.button<{ $active: boolean }>`
  font-family: ${fonts.sans};
  font-size: 12px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? "#6366f1" : "#334155"};
  background: ${({ $active }) => $active ? "#6366f1" : "transparent"};
  color: ${({ $active }) => $active ? "#fff" : "#94a3b8"};
  cursor: pointer;
  ${({ $active }) => $active && "outline: 2px solid #818cf8; outline-offset: 2px;"}
  &:hover { border-color: #6366f1; color: #fff; }
`;
const Hint = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; color: #475569; margin-top: 2px;
`;
