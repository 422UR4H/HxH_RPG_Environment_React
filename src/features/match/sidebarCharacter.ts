import type { ComponentProps } from "react";
import CharacterSidebarItem from "../../components/molecules/CharacterSidebarItem";
import type { CharacterPrivateSummary } from "../../types/characterSheet";
import type { CharacterSheetWithVisibility } from "../../types/match";

export type SidebarCharacter = ComponentProps<typeof CharacterSidebarItem>["character"];

/**
 * Os dois formatos que chegam ao card (participante `{...base, private}` e o plano
 * `CharacterPrivateSummary` da campanha) viram um só. A base é pública — cor de NPC, de
 * morto, avatar e capa saem dela — e o `private` entra quando o servidor o mandou.
 */
export function toSidebarCharacter(
  sheet: CharacterSheetWithVisibility | CharacterPrivateSummary,
): SidebarCharacter {
  if ("private" in sheet) {
    const { private: priv, ...rest } = sheet;
    return { ...rest, ...(priv ?? {}) };
  }
  return sheet;
}
