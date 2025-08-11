import type { DiagramsMode } from "./diagramsMode";
import type { HeaderMode } from "./headerMode";
import type { ProficiencyMode } from "./proficiencyMode";
import type { ProfileMode } from "./profileMode";
import type { SkillsMode } from "./skillsMode";

export interface SheetMode {
  headerMode: HeaderMode;
  profileMode: ProfileMode;
  diagramsMode: DiagramsMode;
  proficiencyMode: ProficiencyMode;
  skillsMode: SkillsMode;
}
