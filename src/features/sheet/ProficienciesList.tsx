import { useMemo, useState } from "react";
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
import { ProfilePillSelect } from "./ProfileFieldStyles";

interface ProficienciesListProps {
  mode: ProficiencyMode;
  commonProfs?: Record<string, Proficiency>;
  jointProfs?: Record<string, JointProficiency>;
  distribution?: Distribution;
  charSheet?: CharacterSheet;
  setCharSheet?: (s: CharacterSheet) => void;
}

interface WeaponSlotSelectProps {
  label: string;
  value: string;
  allowed: string[];
  /** Armas já escolhidas nos outros espaços: aparecem apagadas e não selecionáveis. */
  taken: string[];
  onChange: (weapon: string) => void;
}

function WeaponSlotSelect({ label, value, allowed, taken, onChange }: WeaponSlotSelectProps) {
  const takenKey = taken.join("|");
  // Identidade estável: a posição da lista aberta é recalculada quando o array muda.
  const options = useMemo(
    () => [
      { value: "", label: "Escolher arma…" },
      ...allowed.map((weapon) => ({
        value: weapon,
        label: weapon,
        disabled: takenKey.split("|").includes(weapon),
      })),
    ],
    [allowed, takenKey],
  );
  return <SlotSelect aria-label={label} value={value} options={options} onChange={onChange} />;
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
  // commonProficiencies keys arrive from the backend already camelCase ("throwingDagger").
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
              <WeaponSlotSelect
                label={`Arma do nível ${point.level}, espaço ${i + 1}`}
                value={slotSelections[i]}
                allowed={distribution.proficienciesAllowed}
                taken={otherSelected}
                onChange={(weapon) => handleSlotChange(i, weapon)}
              />
            </DistributionSlot>
          );
        })}

      {jointProfs &&
        Object.entries(jointProfs).map(([name, prof]) => (
          <ProficiencyCard
            key={name}
            name={name}
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
  border: 4px solid ${({ $selected }) => ($selected ? colors.brandAccent : colors.borderStrong)};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SlotLevel = styled.div`
  font-weight: 700;
  font-size: min(22px, 5cqi);
  color: ${colors.textPrimary};
`;

const SlotExp = styled.span`
  font-weight: 400;
  font-size: 0.8em;
  color: ${colors.textInputDisabled};
`;

const SlotSelect = styled(ProfilePillSelect)`
  width: 100%;
  border-radius: 14px;
  background-position: right 12px center;
`;
