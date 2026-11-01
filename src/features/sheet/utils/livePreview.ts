import type { CharacterClass } from "../../../types/characterClass";
import type { CharacterSheet } from "../../../types/characterSheet";
import { normalizeSheetEnumKeyedMaps } from "../../../services/characterSheetsService";
import { computeSheet } from "../engine";
import { buildSheetInput } from "./sheetInput";

/**
 * A ficha como o back vai calculá-la a partir do que está prestes a ser
 * enviado: roda o motor (`../engine`) sobre `buildSheetInput` e troca os campos
 * calculados (níveis, poder, valores, princípios, barras, nível do personagem).
 * O resto da ficha (perfil, pontos, escolhas) fica como está.
 *
 * Passa pelo mesmo normalizador do GET, para a prévia e a ficha salva usarem o
 * mesmo caminho de exibição. Sem `definition` na classe (back antigo) ou se o
 * motor falhar, devolve a ficha sem prévia — a tela continua funcionando.
 */
export function withLivePreview(
  charSheet: CharacterSheet,
  charClass: CharacterClass | undefined,
): CharacterSheet {
  if (!charClass?.definition) return charSheet;

  let computed: CharacterSheet;
  try {
    const wire = computeSheet(
      charClass.profile.name,
      charClass.definition,
      buildSheetInput(charSheet, charClass),
    );
    // o wire tem a forma do GET /charactersheets/:id, que o service também lê como CharacterSheet
    computed = normalizeSheetEnumKeyedMaps({ ...charSheet, ...wire } as unknown as CharacterSheet);
  } catch (err) {
    console.error("Prévia da ficha indisponível:", err);
    return charSheet;
  }

  return {
    ...computed,
    // mantém a grafia das chaves que a tela já usa ("Bow" escolhida no slot,
    // "dagger" vinda do GET), para os slots continuarem reconhecendo as armas
    commonProficiencies: keepKeySpelling(computed.commonProficiencies, charSheet.commonProficiencies),
  };
}

function keepKeySpelling<T>(computed: Record<string, T>, original: Record<string, T> | undefined) {
  const lower = (k: string) => k.charAt(0).toLowerCase() + k.slice(1);
  const spelling = new Map(Object.keys(original ?? {}).map((k) => [lower(k), k]));
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(computed)) out[spelling.get(key) ?? key] = value;
  return out;
}
