import { useState, useEffect } from "react";
import styled from "styled-components";
import { fonts } from "../../styles/tokens";
import type { WallMaterial, WallSegment, WallType } from "../../types/tacticalMap";

type Props = {
  wall: WallSegment;
  onUpdate: (patch: Partial<WallSegment>) => void;
  onRemove: () => void;
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

export default function WallConfigPanel({ wall, onUpdate, onRemove }: Props) {
  const [editedType, setEditedType] = useState<WallType>(wall.wallType);
  const [editedMaterial, setEditedMaterial] = useState<WallMaterial>(wall.material);

  useEffect(() => {
    setEditedType(wall.wallType);
    setEditedMaterial(wall.material);
  }, [wall.id, wall.wallType, wall.material]);

  return (
    <Container>
      <Badge>
        <BadgeDot />
        <BadgeLabel>Parede Selecionada</BadgeLabel>
      </Badge>

      <Section>
        <SectionLabel>Tipo</SectionLabel>
        <ChipRow>
          {WALL_TYPES.map(({ value, label }) => (
            <Chip
              key={value}
              type="button"
              $active={editedType === value}
              onClick={() => setEditedType(value)}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>

      <Section>
        <SectionLabel>Material</SectionLabel>
        <ChipRow>
          {MATERIALS.map(({ value, label }) => (
            <Chip
              key={value}
              type="button"
              $active={editedMaterial === value}
              onClick={() => setEditedMaterial(value)}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
      </Section>

      <Actions>
        <ApplyButton
          type="button"
          onClick={() => onUpdate({ wallType: editedType, material: editedMaterial })}
        >
          Aplicar
        </ApplyButton>
        <DeleteButton type="button" onClick={onRemove}>
          Deletar
        </DeleteButton>
      </Actions>
    </Container>
  );
}

const Container = styled.div`
  display: flex; flex-direction: column; gap: 12px; padding: 12px;
  font-family: ${fonts.sans};
`;
const Badge = styled.div`
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 6px;
  background: #0f172a; border: 1px solid #6366f1;
`;
const BadgeDot = styled.div`
  width: 6px; height: 6px; border-radius: 50%; background: #818cf8; flex-shrink: 0;
`;
const BadgeLabel = styled.span`
  font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: #818cf8;
`;
const Section = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const SectionLabel = styled.span`
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
const Actions = styled.div`
  display: flex; gap: 8px;
`;
const ApplyButton = styled.button`
  font-family: ${fonts.sans};
  flex: 1; padding: 7px; border-radius: 6px;
  border: none; background: #6366f1; color: #fff;
  font-size: 12px; font-weight: 600; cursor: pointer;
  &:hover { background: #4f46e5; }
`;
const DeleteButton = styled.button`
  font-family: ${fonts.sans};
  padding: 7px 12px; border-radius: 6px;
  border: 1px solid #991b1b; background: transparent; color: #ef4444;
  font-size: 12px; cursor: pointer;
  &:hover { background: #7f1d1d; color: #fff; }
`;
