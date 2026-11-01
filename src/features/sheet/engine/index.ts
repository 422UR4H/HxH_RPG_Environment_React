// API pública do motor da ficha. Fora desta pasta, importe só daqui.
import { buildSheet } from "./buildSheet";
import { toWire } from "./toWire";
import type { ClassDefinition, SheetInput, SheetWire } from "./types";

export type {
  AttributeWire,
  ClassDefinition,
  ExperienceWire,
  SheetInput,
  SheetWire,
  StatusWire,
} from "./types";
export { MENTAL_PRIMARIES, PHYSICAL_PRIMARIES } from "./buildSheet";

/**
 * Calcula a ficha que o back monta a partir do mesmo envio (classe + o que o
 * jogador distribuiu), no formato do wire de GET /charactersheets/:id.
 * Não valida a distribuição: pontos parciais são calculados como estão.
 */
export function computeSheet(
  characterClass: string,
  definition: ClassDefinition,
  input: SheetInput,
): SheetWire {
  return toWire(buildSheet(characterClass, definition, input));
}
