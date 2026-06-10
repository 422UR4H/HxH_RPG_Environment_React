import styled from "styled-components";
import { fonts } from "../../styles/tokens";
import type { WallMaterial, WallType } from "../../types/tacticalMap";

type Props = {
  activeType: WallType;
  activeMaterial: WallMaterial;
  onTypeChange: (t: WallType) => void;
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

export default function WallTypeChips({ activeType, activeMaterial, onTypeChange, onMaterialChange }: Props) {
  return (
    <Container>
      <Section>
        <SectionLabel>Tipo</SectionLabel>
        <ChipRow>
          {WALL_TYPES.map(({ value, label }) => (
            <Chip key={value} type="button" $active={activeType === value} onClick={() => onTypeChange(value)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>
      <Section>
        <SectionLabel>Material</SectionLabel>
        <ChipRow>
          {MATERIALS.map(({ value, label }) => (
            <Chip key={value} type="button" $active={activeMaterial === value} onClick={() => onMaterialChange(value)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 12px;
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
  &:hover { border-color: #6366f1; color: #fff; }
`;
