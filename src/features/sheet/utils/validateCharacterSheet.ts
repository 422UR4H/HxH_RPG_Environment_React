import type { CharacterClass } from "../../../types/characterClass";
import type { CharacterSheet } from "../../../types/characterSheet";

export function validateCharacterSheet(
  charSheet: CharacterSheet,
  charClasses: CharacterClass[] | undefined,
  context: "create" | "edit" = "create",
): string | null {
  const errors: string[] = [];
  const { profile, characterClass, abilities, physicalAttributes, mentalAttributes } = charSheet;
  const action = context === "create" ? "criar a ficha" : "salvar a ficha";

  if (!characterClass) errors.push("Selecione uma classe para o personagem.");

  const nick = profile.nickname.trim();
  if (nick.length < 3 || nick.length > 10)
    errors.push("Nickname deve ter entre 3 e 10 caracteres.");

  const full = profile.fullname.trim();
  if (full.length < 6 || full.length > 32)
    errors.push("Nome completo deve ter entre 6 e 32 caracteres.");

  if ((profile.briefDescription ?? "").length > 255)
    errors.push("Descrição breve deve ter no máximo 255 caracteres.");

  if (profile.age < 0) errors.push("Idade não pode ser negativa.");

  const physicalsBudget = abilities["physicals"]?.level ?? 0;
  const physicalsSpent = Object.values(physicalAttributes).reduce(
    (sum, attr) => sum + (attr.points || 0),
    0,
  );
  if (physicalsBudget - physicalsSpent > 0)
    errors.push(`Distribua todos os pontos de atributos físicos antes de ${action}.`);

  const mentalsBudget = abilities["mentals"]?.level ?? 0;
  const mentalsSpent = Object.values(mentalAttributes).reduce(
    (sum, attr) => sum + (attr.points || 0),
    0,
  );
  if (mentalsBudget - mentalsSpent > 0)
    errors.push(`Distribua todos os pontos de atributos mentais antes de ${action}.`);

  const selectedClass = charClasses?.find((cc) => cc.profile.name === characterClass);
  if (selectedClass?.distribution) {
    const d = selectedClass.distribution;
    const filled = d.proficienciesAllowed.filter(
      (w) => (charSheet.commonProficiencies[w]?.exp ?? 0) > 0,
    ).length;
    if (filled < d.proficiencyPoints.length)
      errors.push(`Selecione todas as proficiências distribuíveis antes de ${action}.`);
  }

  return errors.length > 0 ? errors.join("\n") : null;
}
