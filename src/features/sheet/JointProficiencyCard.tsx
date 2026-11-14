import { useId, useState } from "react";
import styled from "styled-components";
import Collapse from "../../components/atoms/Collapse";
import ExpandButton from "../../components/ions/ExpandButton";
import ExpBar from "../../components/ions/ExpBar";
import { iconButtonFx } from "../../styles/iconButtonFx";
import { colors } from "../../styles/tokens";
import {
  ProficiencyCardContent,
  ProficiencyItem,
  ProficiencyLevel,
  ProficiencyName,
  capitalize,
  secondaryTextSize,
} from "./proficiencyCardParts";

// A partir deste número de armas a lista aberta precisa da linha inteira.
const JOINT_FULL_ROW_FROM = 9;

export interface JointProficiencyCardProps {
  name: string;
  level: number;
  currExp?: number;
  nextLvlBaseExp?: number;
  weapons: string[];
  damageOf: (weapon: string) => string | undefined;
}

export default function JointProficiencyCard({
  name,
  level,
  currExp,
  nextLvlBaseExp,
  weapons,
  damageOf,
}: JointProficiencyCardProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const hasWeapons = weapons.length > 0;
  const displayName = capitalize(name);
  const weaponsLabel = weapons.length === 1 ? "1 arma" : `${weapons.length} armas`;

  return (
    <Card $fullRow={open && weapons.length >= JOINT_FULL_ROW_FROM}>
      <ProficiencyCardContent $hasBelow={hasWeapons}>
        <ProficiencyName>{displayName}</ProficiencyName>
        <ProficiencyLevel>Level: {level}</ProficiencyLevel>
      </ProficiencyCardContent>
      {hasWeapons && (
        <>
          <ToggleButton
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls={listId}
            aria-label={`${displayName}: ${weaponsLabel}`}
          >
            <span>{weaponsLabel}</span>
            <ExpandButton isExpanded={open} />
          </ToggleButton>
          <Collapse open={open} id={listId}>
            <WeaponList>
              {weapons.map((weapon) => {
                const damage = damageOf(weapon);
                return (
                  <WeaponRow key={weapon}>
                    <span>{weapon}</span>
                    {damage && <WeaponDamage>{damage}</WeaponDamage>}
                  </WeaponRow>
                );
              })}
            </WeaponList>
          </Collapse>
        </>
      )}
      <ExpBar currExp={currExp ?? 0} maxExp={nextLvlBaseExp ?? 1} />
    </Card>
  );
}

// O seletor duplo vence o `flex: 1 1 260px` que o container da lista aplica a todo filho.
const Card = styled(ProficiencyItem)<{ $fullRow: boolean }>`
  &&& {
    ${({ $fullRow }) => ($fullRow ? "flex-basis: 100%;" : "")}
  }
`;

const ToggleButton = styled.button`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 4px 15px 10px;
  border: 0;
  background: none;
  color: ${colors.textMuted};
  font: inherit;
  font-size: ${secondaryTextSize};
  text-align: left;
  cursor: pointer;
  ${iconButtonFx(1.15)}

  /* O card é overflow: hidden e o botão ocupa a largura toda: o anel global (offset 3px) seria cortado. */
  &:focus-visible {
    outline-offset: -3px;
  }

  /* Seta "vazando": maior que a linha de texto e sai do padding sem aumentar a altura da linha. */
  img {
    width: 1.8em;
    min-width: 26px;
    margin-block: -0.35em;
  }

  @media (any-pointer: coarse) {
    min-height: 44px;
  }
`;

const WeaponList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 15px 8px;
  font-size: ${secondaryTextSize};
  column-width: 220px;
  column-gap: 24px;
`;

const WeaponRow = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 12px;
  padding: 6px 0;
  border-top: 1px solid ${colors.borderMuted};
  break-inside: avoid;
`;

const WeaponDamage = styled.span`
  color: ${colors.textMuted};
  white-space: nowrap;
`;
