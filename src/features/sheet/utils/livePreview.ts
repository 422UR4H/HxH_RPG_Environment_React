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
  context: "create" | "edit" = "create",
): CharacterSheet {
  if (!charClass?.definition) return charSheet;

  let computed: CharacterSheet;
  try {
    const input = buildSheetInput(charSheet, charClass);
    const placeholders = context === "create" ? unchosenLots(charSheet, charClass) : {};
    // as vagas ainda sem arma entram na conta com armas de enfeite (ver unchosenLots)
    for (const [weapon, exp] of Object.entries(placeholders)) input.proficienciesExps[weapon] = exp;
    const wire = computeSheet(charClass.profile.name, charClass.definition, input);
    // a arma de enfeite só existiu para o XP escorrer; não aparece na ficha
    for (const weapon of Object.keys(placeholders)) delete wire.commonProficiencies[weapon];
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

/**
 * O XP das armas da classe (ex.: Ninja [127], Hunter [127, 127]) já conta como
 * distribuído desde a escolha da classe: o back o escorre pela mesma cascata
 * (proficiência -> perícias físicas -> ...) seja qual for a arma, então escolher
 * ou trocar a arma só decide qual cartão mostra a proficiência — nada mais na
 * ficha pode mudar (senão os "Pontos para Distribuir" mexem sob a mão do jogador).
 *
 * Só na criação: numa ficha existente (edição completa) o exp da arma pode já
 * ter passado do lote, e a vaga não se reconheceria — contaria em dobro.
 *
 * Devolve, para cada vaga ainda sem arma, uma arma de enfeite com o exp da vaga.
 * A de enfeite evita as armas já escolhidas, as fixas da classe (mesma chave
 * seria sobrescrita) e as de proficiência conjunta (receberia o XP no lugar).
 */
function unchosenLots(charSheet: CharacterSheet, charClass: CharacterClass): Record<string, number> {
  const distribution = charClass.distribution;
  const definition = charClass.definition;
  if (!distribution || !definition || distribution.proficiencyPoints.length === 0) return {};

  const toCamel = (k: string) => k.charAt(0).toLowerCase() + k.slice(1);
  const allowed = distribution.proficienciesAllowed;
  const chosen = new Set(
    Object.keys(charSheet.commonProficiencies ?? {}).map(toCamel).filter((k) => allowed.some((w) => toCamel(w) === k)),
  );

  // vagas livres: tira da lista das vagas o exp de cada arma já escolhida
  const free = distribution.proficiencyPoints.map((p) => p.exp);
  for (const [name, prof] of Object.entries(charSheet.commonProficiencies ?? {})) {
    if (!chosen.has(toCamel(name))) continue;
    const i = free.indexOf(prof.exp ?? 0);
    if (i >= 0) free.splice(i, 1);
  }
  if (free.length === 0) return {};

  const taken = new Set([
    ...chosen,
    ...Object.keys(definition.proficienciesExps).map(toCamel),
    ...definition.jointProficiencies.flatMap((j) => j.weapons.map(toCamel)),
  ]);
  const candidates = allowed.filter((w) => !taken.has(toCamel(w)));
  const out: Record<string, number> = {};
  free.forEach((exp, i) => {
    if (candidates[i]) out[candidates[i]] = exp;
    else console.warn(`Classe ${charClass.profile.name}: sem arma de enfeite para o lote de ${exp} XP; a prévia ficará abaixo do back.`);
  });
  return out;
}

function keepKeySpelling<T>(computed: Record<string, T>, original: Record<string, T> | undefined) {
  const lower = (k: string) => k.charAt(0).toLowerCase() + k.slice(1);
  const spelling = new Map(Object.keys(original ?? {}).map((k) => [lower(k), k]));
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(computed)) out[spelling.get(key) ?? key] = value;
  return out;
}
