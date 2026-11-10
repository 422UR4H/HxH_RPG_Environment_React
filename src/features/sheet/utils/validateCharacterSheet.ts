import type { CharacterClass } from "../../../types/characterClass";
import type { CharacterSheet } from "../../../types/characterSheet";
import { spentPrimaryPoints } from "./sheetInput";
import { withLivePreview } from "./livePreview";

export function validateCharacterSheet(
  charSheet: CharacterSheet,
  charClasses: CharacterClass[] | undefined,
  context: "create" | "edit" = "create",
): string | null {
  const errors: string[] = [];
  const { profile, characterClass, physicalAttributes, mentalAttributes } = charSheet;
  const selectedClass = charClasses?.find((cc) => cc.profile.name === characterClass);
  // o nível que define os pontos é o que o back vai calcular com as escolhas
  // feitas (proficiência escolhida pode subir nível), não o da classe pura
  const { abilities } = withLivePreview(charSheet, selectedClass);
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

  if (profile.age < 1) errors.push("A idade deve ser maior que zero.");

  // Como o back (ApplyInitialAttributePoints): a soma dos primários tem que
  // fechar exatamente no nível. Os intermediários (força etc.) são derivados e
  // chegam com pontos no GET da edição — não contam.
  const pointsError = (kind: "physical" | "mental", label: string) => {
    const budget = abilities[kind === "physical" ? "physicals" : "mentals"]?.level ?? 0;
    const spent = spentPrimaryPoints(
      kind === "physical" ? physicalAttributes : mentalAttributes,
      kind,
    );
    if (spent < budget) return `Distribua todos os pontos de atributos ${label} antes de ${action}.`;
    if (spent > budget)
      return `Há ${spent - budget} ponto(s) de atributos ${label} além do disponível: remova antes de ${action}.`;
    return null;
  };
  for (const err of [pointsError("physical", "físicos"), pointsError("mental", "mentais")]) {
    if (err) errors.push(err);
  }

  if (selectedClass?.distribution) {
    const d = selectedClass.distribution;
    const toCamel = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
    const filled = d.proficienciesAllowed.filter((w) => {
      const camelKey = toCamel(w);
      return (charSheet.commonProficiencies[w]?.exp ?? charSheet.commonProficiencies[camelKey]?.exp ?? 0) > 0;
    }).length;
    if (filled < d.proficiencyPoints.length)
      errors.push(`Selecione todas as proficiências distribuíveis antes de ${action}.`);
  }

  return errors.length > 0 ? errors.join("\n") : null;
}
