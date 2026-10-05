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
  /** Dentro de outra tela (a partida): sem voltar e sem ações de rodapé. */
  embedded?: boolean;
}

/** O quarto modo (§5.6 do documento mestre): a ficha de fora, só leitura, dentro da partida. */
export const MATCH_SHEET_MODE: SheetMode = {
  headerMode: "view",
  profileMode: "view",
  diagramsMode: "view",
  proficiencyMode: "view",
  skillsMode: "view",
  embedded: true,
};
