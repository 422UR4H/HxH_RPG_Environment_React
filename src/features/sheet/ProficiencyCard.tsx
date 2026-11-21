import ExpBar from "../../components/ions/ExpBar";
import {
  ProficiencyCardContent,
  ProficiencyDamage,
  ProficiencyItem,
  ProficiencyLevel,
  ProficiencyName,
  capitalize,
} from "./proficiencyCardParts";

export interface ProficiencyCardProps {
  name: string;
  level: number;
  currExp?: number;
  nextLvlBaseExp?: number;
  /** Dano da arma já formatado; ausente enquanto o catálogo não chegou (nada é mostrado). */
  damage?: string;
}

export default function ProficiencyCard({ name, level, currExp, nextLvlBaseExp, damage }: ProficiencyCardProps) {
  return (
    <ProficiencyItem>
      <ProficiencyCardContent $hasBelow={!!damage}>
        <ProficiencyName>{capitalize(name)}</ProficiencyName>
        <ProficiencyLevel>Level: {level}</ProficiencyLevel>
      </ProficiencyCardContent>
      {damage && <ProficiencyDamage>{damage}</ProficiencyDamage>}
      <ExpBar currExp={currExp ?? 0} maxExp={nextLvlBaseExp ?? 1} />
    </ProficiencyItem>
  );
}
