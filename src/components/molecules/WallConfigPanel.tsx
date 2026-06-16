import { useState, useEffect } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";
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

const LOCKABLE: WallType[] = ["door", "window", "secret_door"];

export default function WallConfigPanel({ wall, onUpdate, onRemove }: Props) {
  const [editedType, setEditedType] = useState<WallType>(wall.wallType);
  const [editedMaterial, setEditedMaterial] = useState<WallMaterial>(wall.material);
  const [editedLocked, setEditedLocked] = useState<boolean>(wall.locked);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setEditedType(wall.wallType);
    setEditedMaterial(wall.material);
    setEditedLocked(wall.locked);
    setApplied(false);
  }, [wall.id, wall.wallType, wall.material, wall.locked]);

  const handleApply = () => {
    onUpdate({
      wallType: editedType,
      material: editedMaterial,
      locked: LOCKABLE.includes(editedType) ? editedLocked : false,
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

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

      {LOCKABLE.includes(editedType) && (
        <Section>
          <SectionLabel>Estado inicial</SectionLabel>
          <LockToggle
            type="button"
            $locked={editedLocked}
            onClick={() => setEditedLocked((v) => !v)}
          >
            {editedLocked ? "Trancado" : "Destrancado"}
          </LockToggle>
        </Section>
      )}

      <Actions>
        <ApplyButton type="button" $applied={applied} onClick={handleApply}>
          {applied ? "Aplicado ✓" : "Aplicar"}
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
  background: ${colors.surfaceInput}; border: 1px solid ${colors.brandAccent};
`;
const BadgeDot = styled.div`
  width: 6px; height: 6px; border-radius: 50%;
  background: ${colors.brandAccent}; flex-shrink: 0;
`;
const BadgeLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: ${colors.brandAccentBright};
`;
const Section = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;
const SectionLabel = styled.span`
  font-family: ${fonts.sans};
  font-size: 11px; font-weight: 600;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase; letter-spacing: 0.05em;
`;
const ChipRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
`;
const Chip = styled.button<{ $active: boolean }>`
  font-family: ${fonts.sans};
  font-size: 12px; padding: 4px 10px; border-radius: 999px;
  border: 1px solid ${({ $active }) => $active ? colors.brandAccent : colors.borderInput};
  background: ${({ $active }) => $active ? colors.brandAccent : "transparent"};
  color: ${({ $active }) => $active ? colors.textPrimary : colors.textPlaceholderStrong};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  &:hover { border-color: ${colors.brandAccent}; color: ${colors.textPrimary}; }
`;
const LockToggle = styled.button<{ $locked: boolean }>`
  font-family: ${fonts.sans};
  font-size: 12px; padding: 5px 14px; border-radius: 999px;
  border: 1px solid ${({ $locked }) => $locked ? colors.dangerDark : colors.borderInput};
  background: ${({ $locked }) => $locked ? colors.errorBgSoft : "transparent"};
  color: ${({ $locked }) => $locked ? colors.danger : colors.textPlaceholderStrong};
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  &:hover { border-color: ${colors.danger}; color: ${colors.danger}; }
`;
const Actions = styled.div`
  display: flex; gap: 8px;
`;
const ApplyButton = styled.button<{ $applied: boolean }>`
  font-family: ${fonts.sans};
  flex: 1; padding: 7px; border-radius: 6px;
  border: none;
  background: ${({ $applied }) => $applied ? colors.brandAccentBright : colors.brandAccent};
  color: ${colors.textPrimary};
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background 0.2s;
  &:hover { background: ${colors.brandAccentBright}; }
`;
const DeleteButton = styled.button`
  font-family: ${fonts.sans};
  padding: 7px 12px; border-radius: 6px;
  border: 1px solid ${colors.dangerDark}; background: transparent; color: ${colors.danger};
  font-size: 12px; cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover { background: ${colors.dangerDark}; color: ${colors.textPrimary}; }
`;
