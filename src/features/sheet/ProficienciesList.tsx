import { useState, useEffect } from "react";
import styled from "styled-components";
import type { ProficiencyMode } from "./types/proficiencyMode";
import type {
  JointProficiency,
  CharacterSheet,
} from "../../types/characterSheet";
import type { Distribution } from "../../types/characterClass";

interface ProficienciesListProps {
  mode: ProficiencyMode;
  commonProfs?: Record<string, { level: number }>;
  jointProfs?: JointProficiency[];
  distribution?: Distribution;
  charSheet?: CharacterSheet;
  setCharSheet?: (s: CharacterSheet) => void;
}

export default function ProficienciesList({
  mode,
  commonProfs,
  jointProfs,
  distribution,
  charSheet,
  setCharSheet,
}: ProficienciesListProps) {
  const [slotSelections, setSlotSelections] = useState<string[]>(() =>
    Array(distribution?.proficiencyPoints.length ?? 0).fill(""),
  );

  useEffect(() => {
    setSlotSelections(prev =>
      (distribution?.proficiencyPoints ?? []).map((_, i) => {
        const weapon = prev[i] ?? "";
        return weapon && (charSheet?.commonProficiencies[weapon]?.exp ?? 0) > 0 ? weapon : "";
      })
    );
  }, [charSheet, distribution]);

  const handleSlotChange = (slotIndex: number, newWeapon: string) => {
    if (!charSheet || !setCharSheet || !distribution) return;
    const oldWeapon = slotSelections[slotIndex];
    const next = [...slotSelections];
    next[slotIndex] = newWeapon;
    setSlotSelections(next);

    const updatedProfs = { ...charSheet.commonProficiencies };
    if (oldWeapon) delete updatedProfs[oldWeapon];
    if (newWeapon) {
      const point = distribution.proficiencyPoints[slotIndex];
      updatedProfs[newWeapon] = { exp: point.exp, level: point.level };
    }
    setCharSheet({ ...charSheet, commonProficiencies: updatedProfs });
  };

  const distributableSet = new Set(distribution?.proficienciesAllowed ?? []);
  const fixedProfs =
    mode === "create" && distribution
      ? Object.fromEntries(
          Object.entries(commonProfs ?? {}).filter(
            ([name]) => !distributableSet.has(name),
          ),
        )
      : commonProfs;

  return (
    <ProficienciesListContainer>
      {fixedProfs &&
        Object.entries(fixedProfs).map(([name, { level }]) => (
          <ProficiencyItem key={name}>
            <ProficiencyName>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </ProficiencyName>
            <ProficiencyLevel>Level: {level}</ProficiencyLevel>
          </ProficiencyItem>
        ))}

      {mode === "create" &&
        distribution?.proficiencyPoints.map((point, i) => {
          const otherSelected = slotSelections.filter((_, j) => j !== i);
          return (
            <DistributionSlot key={i} $selected={!!slotSelections[i]}>
              <SlotLevel>
                Lv {point.level} <SlotExp>· {point.exp} XP</SlotExp>
              </SlotLevel>
              <SlotSelect
                value={slotSelections[i]}
                onChange={(e) => handleSlotChange(i, e.target.value)}
              >
                <SlotOption value="">Escolher arma…</SlotOption>
                {distribution.proficienciesAllowed.map((weapon) => (
                  <SlotOption
                    key={weapon}
                    value={weapon}
                    disabled={otherSelected.includes(weapon)}
                  >
                    {weapon}
                  </SlotOption>
                ))}
              </SlotSelect>
            </DistributionSlot>
          );
        })}

      {jointProfs &&
        jointProfs.length > 0 &&
        jointProfs.map(({ name, level }) => (
          <ProficiencyItem key={name}>
            <ProficiencyName>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </ProficiencyName>
            <ProficiencyLevel>Level: {level}</ProficiencyLevel>
          </ProficiencyItem>
        ))}
    </ProficienciesListContainer>
  );
}

const ProficienciesListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 300px));
  gap: 15px;
`;

const ProficiencyItem = styled.div`
  font-size: 24px;
  background-color: #444;
  border-radius: 6px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProficiencyName = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 500;
  font-size: min(22px, 5cqi);
`;

const ProficiencyLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 400;
  font-size: min(22px, 5cqi);
  color: #9f9f9f;
`;

const DistributionSlot = styled.div<{ $selected: boolean }>`
  background-color: #444;
  border-radius: 12px;
  padding: 15px;
  border: 4px solid ${({ $selected }) => ($selected ? "#107135" : "#666")};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SlotLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: min(22px, 5cqi);
  color: white;
`;

const SlotExp = styled.span`
  font-weight: 400;
  font-size: 0.8em;
  color: #9f9f9f;
`;

const SlotSelect = styled.select`
  width: 100%;

  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  border: 4px solid #107135;
  border-radius: 14px;
  padding: 8px min(8cqi, 46px) 8px 16px;
  cursor: pointer;

  /* remove down arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* add new down arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: min(4.4cqi, 28px);

  &:active {
    outline: none;
    border-color: white;
  }
  &:focus {
    outline: none;
  }
  &:hover {
    filter: brightness(1.1);
  }

  option:disabled {
    color: #555;
    background-color: #333;
  }
`;

const SlotOption = styled.option`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  padding-right: 40px;
`;
