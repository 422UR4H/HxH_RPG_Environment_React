import type { CharacterSheet } from "../../../types/characterSheet";

export type AttributeGroup = "physicalAttributes" | "mentalAttributes";

/**
 * Soma `delta` aos pontos de um atributo sem mutar a ficha recebida: devolve uma
 * ficha nova (ficha, mapa e atributo novos). Atributo inexistente devolve a própria ficha.
 */
export function withAttributePointsChanged(
  sheet: CharacterSheet,
  group: AttributeGroup,
  name: string,
  delta: 1 | -1,
): CharacterSheet {
  const attr = sheet[group][name];
  if (!attr) return sheet;
  return {
    ...sheet,
    [group]: {
      ...sheet[group],
      [name]: { ...attr, points: (attr.points ?? 0) + delta },
    },
  };
}
