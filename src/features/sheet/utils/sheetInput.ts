import type { CharacterClass } from "../../../types/characterClass";
import type { CharacterSheet } from "../../../types/characterSheet";
import { MENTAL_PRIMARIES, PHYSICAL_PRIMARIES } from "../engine";
import type { SheetInput } from "../engine";

const toApiKey = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
const toCamel = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

/**
 * O que o front envia ao criar/editar a ficha (skillsExps, proficienciesExps,
 * attributePoints). Um lugar só: o POST, o PATCH e a prévia ao vivo
 * (`withLivePreview`) usam esta função, para que a prévia calcule exatamente o
 * envio que o back vai receber.
 *
 * - Perícias e proficiências só entram se a classe permite distribuí-las; as
 *   fixas da classe o back já conhece.
 * - Só atributos primários levam pontos: os intermediários (força etc.) são
 *   derivados, e o back recusa pontos neles.
 */
export function buildSheetInput(charSheet: CharacterSheet, charClass?: CharacterClass): SheetInput {
  const allowedSkills = new Set(charClass?.distribution?.skillsAllowed ?? []);
  const skillsExps: Record<string, number> = {};
  const allSkills = { ...charSheet.physicalSkills, ...charSheet.spiritualSkills };
  Object.entries(allSkills).forEach(([name, skill]) => {
    const apiKey = toApiKey(name);
    if (skill.exp && skill.exp > 0 && allowedSkills.has(apiKey)) skillsExps[apiKey] = skill.exp;
  });

  // a arma escolhida entra com o nome do enum ("ThrowingDagger"); a que veio do
  // GET chega normalizada ("throwingDagger") — as duas mapeiam para o nome do enum
  const allowedProfs = new Map<string, string>();
  (charClass?.distribution?.proficienciesAllowed ?? []).forEach((w) => {
    allowedProfs.set(w, w);
    allowedProfs.set(toCamel(w), w);
  });
  const proficienciesExps: Record<string, number> = {};
  Object.entries(charSheet.commonProficiencies ?? {}).forEach(([name, prof]) => {
    const weapon = allowedProfs.get(name);
    if (weapon && prof.exp && prof.exp > 0) proficienciesExps[weapon] = prof.exp;
  });

  const attributePoints: Record<string, number> = {};
  const collect = (attrs: CharacterSheet["physicalAttributes"], primaries: readonly string[]) => {
    for (const apiKey of primaries) {
      const points = attrs?.[toCamel(apiKey)]?.points ?? 0;
      if (points > 0) attributePoints[apiKey] = points;
    }
  };
  collect(charSheet.physicalAttributes, PHYSICAL_PRIMARIES);
  collect(charSheet.mentalAttributes, MENTAL_PRIMARIES);

  return { skillsExps, proficienciesExps, attributePoints };
}

/** Pontos já gastos nos atributos primários (os intermediários são derivados). */
export function spentPrimaryPoints(
  attrs: CharacterSheet["physicalAttributes"] | undefined,
  kind: "physical" | "mental",
): number {
  const primaries = kind === "physical" ? PHYSICAL_PRIMARIES : MENTAL_PRIMARIES;
  return primaries.reduce((sum, apiKey) => sum + (attrs?.[toCamel(apiKey)]?.points ?? 0), 0);
}
