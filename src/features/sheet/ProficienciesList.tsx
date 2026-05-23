import { useState } from "react";
import styled from "styled-components";
import type { ProficiencyMode } from "./types/proficiencyMode";
import type {
  JointProficiency,
  CharacterSheet,
  Proficiency,
} from "../../types/characterSheet";
import type { Distribution } from "../../types/characterClass";
import ProficiencyCard from "./ProficiencyCard";
import { colors } from "../../styles/tokens";

interface ProficienciesListProps {
  mode: ProficiencyMode;
  commonProfs?: Record<string, Proficiency>;
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
  // proficienciesAllowed values are PascalCase ("ThrowingDagger").
  // commonProficiencies keys come through objToCamelCase → camelCase ("throwingDagger").
  // Build a bidirectional map so we can look up by either casing.
  const buildCamelToOriginal = (allowed: string[]) => {
    const toCamel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const map = new Map<string, string>();
    allowed.forEach((w) => { map.set(toCamel(w), w); map.set(w, w); });
    return map;
  };

  const [slotSelections, setSlotSelections] = useState<string[]>(() => {
    if (!distribution) return [];
    const camelToOriginal = buildCamelToOriginal(distribution.proficienciesAllowed);
    const existing = Object.keys(charSheet?.commonProficiencies ?? {})
      .filter((name) => camelToOriginal.has(name))
      .map((name) => camelToOriginal.get(name)!);
    return Array.from({ length: distribution.proficiencyPoints.length }, (_, i) => existing[i] ?? "");
  });

  const handleSlotChange = (slotIndex: number, newWeapon: string) => {
    if (!charSheet || !setCharSheet || !distribution) return;
    const oldWeapon = slotSelections[slotIndex];
    const next = [...slotSelections];
    next[slotIndex] = newWeapon;
    setSlotSelections(next);

    const updatedProfs = { ...charSheet.commonProficiencies };
    if (oldWeapon) {
      delete updatedProfs[oldWeapon];
      // Also remove the camelCase variant that may exist from the API response
      const oldCamel = oldWeapon.charAt(0).toLowerCase() + oldWeapon.slice(1);
      if (oldCamel !== oldWeapon) delete updatedProfs[oldCamel];
    }
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
        Object.entries(fixedProfs).map(([name, prof]) => (
          <ProficiencyCard
            key={name}
            name={name}
            level={prof.level}
            currExp={prof.currExp}
            nextLvlBaseExp={prof.nextLvlBaseExp}
          />
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
        jointProfs.map((prof) => (
          <ProficiencyCard
            key={prof.name}
            name={prof.name}
            level={prof.level}
            currExp={prof.currExp}
            nextLvlBaseExp={prof.nextLvlBaseExp}
          />
        ))}
    </ProficienciesListContainer>
  );
}

const ProficienciesListContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 300px));
  gap: 15px;
`;

const DistributionSlot = styled.div<{ $selected: boolean }>`
  background-color: ${colors.surfaceControl};
  border-radius: 12px;
  padding: 15px;
  border: 4px solid ${({ $selected }) => ($selected ? colors.brandAccent : colors.grayMidStrong)};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SlotLevel = styled.div`
  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: min(22px, 5cqi);
  color: ${colors.textPrimary};
`;

const SlotExp = styled.span`
  font-weight: 400;
  font-size: 0.8em;
  color: ${colors.textInputDisabled};
`;

const SlotSelect = styled.select`
  width: 100%;
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.brandAccent};
  border: 4px solid ${colors.brandAccent};
  border-radius: 14px;
  padding: 8px min(8cqi, 46px) 8px 16px;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: min(4.4cqi, 28px);

  &:active { outline: none; border-color: ${colors.textPrimary}; }
  &:focus { outline: none; }
  &:hover { filter: brightness(1.1); }

  option:disabled { color: ${colors.grayMid}; background-color: ${colors.surfaceMuted}; }
`;

const SlotOption = styled.option`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.brandAccent};
  padding-right: 40px;
`;
