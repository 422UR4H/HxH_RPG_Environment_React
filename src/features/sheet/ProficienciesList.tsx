import { useState, useEffect } from "react";
import styled from "styled-components";
import type { ProficiencyMode } from "./types/proficiencyMode";
import type { JointProficiency, CharacterSheet } from "../../types/characterSheet";
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
    Array(distribution?.proficiencyPoints.length ?? 0).fill("")
  );

  useEffect(() => {
    setSlotSelections(Array(distribution?.proficiencyPoints.length ?? 0).fill(""));
  }, [distribution]);

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
          Object.entries(commonProfs ?? {}).filter(([name]) => !distributableSet.has(name))
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
                Lv {point.level}{" "}
                <SlotExp>· {point.exp} XP</SlotExp>
              </SlotLevel>
              <SlotSelect
                value={slotSelections[i]}
                onChange={(e) => handleSlotChange(i, e.target.value)}
              >
                <option value="">Escolher arma…</option>
                {distribution.proficienciesAllowed.map((weapon) => (
                  <option
                    key={weapon}
                    value={weapon}
                    disabled={otherSelected.includes(weapon)}
                  >
                    {weapon}
                  </option>
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
  border-radius: 6px;
  padding: 15px;
  border: 2px solid ${({ $selected }) => ($selected ? "#107135" : "#666")};
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
  background-color: #555;
  color: white;
  border: 1px solid #666;
  border-radius: 4px;
  padding: 8px;
  font-family: "Roboto", sans-serif;
  font-size: min(18px, 4cqi);
  cursor: pointer;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #107135;
  }

  option:disabled {
    color: #555;
  }
`;
