import { describe, expect, it } from "vitest";
import type { CharacterClass } from "../../../types/characterClass";
import type { CharacterSheet } from "../../../types/characterSheet";
import { lowercaseFirstKeys } from "../../../utils/lowercaseFirstKeys";
import { normalizeSheetEnumKeyedMaps } from "../../../services/characterSheetsService";
import { createEmptyCharacterSheet } from "../factories/characterSheet.factory";
import { distributeAbilities, distributeAttributes, distributeJointProficiencies, distributeProficiencies, distributeSkills } from "../utils/distribute";
import { buildSheetInput } from "../utils/sheetInput";
import { withLivePreview } from "../utils/livePreview";
import { validateCharacterSheet } from "../utils/validateCharacterSheet";

const raw = import.meta.glob("../engine/__fixtures__/sheet_parity.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const fixture = JSON.parse(Object.values(raw)[0]) as {
  classes: Record<string, CharacterClass>;
  cases: { name: string; input: { proficienciesExps: Record<string, number>; attributePoints: Record<string, number> }; expected: Record<string, unknown> }[];
};

// a classe como o characterClassesService a entrega à tela
function serviceClass(name: string): CharacterClass {
  const c = fixture.classes[name];
  return {
    ...c,
    abilities: lowercaseFirstKeys(c.abilities),
    attributes: lowercaseFirstKeys(c.attributes),
    skills: lowercaseFirstKeys(c.skills),
    proficiencies: lowercaseFirstKeys(c.proficiencies),
  };
}

// o estado que a tela monta ao escolher a classe (CharacterSheetHeader → buildFromClass)
function sheetForClass(charClass: CharacterClass): CharacterSheet {
  return {
    ...createEmptyCharacterSheet(),
    characterClass: charClass.profile.name,
    abilities: distributeAbilities(charClass),
    physicalAttributes: distributeAttributes("physical", charClass),
    mentalAttributes: distributeAttributes("mental", charClass),
    spiritualAttributes: distributeAttributes("spiritual", charClass),
    physicalSkills: distributeSkills("physical", charClass),
    spiritualSkills: distributeSkills("spiritual", charClass),
    commonProficiencies: distributeProficiencies(charClass),
    jointProficiencies: distributeJointProficiencies(charClass),
  };
}

// o que os slots (ProficienciesList) e os diagramas fazem com o estado
function choose(sheet: CharacterSheet, charClass: CharacterClass, caseName: string): CharacterSheet {
  const { input } = fixture.cases.find((c) => c.name === caseName)!;
  const next = structuredClone(sheet);
  const points = charClass.distribution?.proficiencyPoints ?? [];
  Object.entries(input.proficienciesExps).forEach(([weapon, exp]) => {
    next.commonProficiencies[weapon] = { exp, level: points.find((p) => p.exp === exp)?.level ?? 0 };
  });
  Object.entries(input.attributePoints).forEach(([apiKey, pts]) => {
    const key = apiKey.charAt(0).toLowerCase() + apiKey.slice(1);
    const group = key in next.physicalAttributes ? next.physicalAttributes : next.mentalAttributes;
    group[key] = { ...group[key], points: pts };
  });
  return next;
}

const expectedFor = (caseName: string) =>
  normalizeSheetEnumKeyedMaps(fixture.cases.find((c) => c.name === caseName)!.expected as unknown as CharacterSheet);

describe("live sheet preview", () => {
  const hunter = serviceClass("Hunter");

  it("sends exactly the input the backend fixture was built from", () => {
    const sheet = choose(sheetForClass(hunter), hunter, "Hunter/profs-alt-points-spread");
    const { input } = fixture.cases.find((c) => c.name === "Hunter/profs-alt-points-spread")!;
    expect(buildSheetInput(sheet, hunter)).toEqual({ skillsExps: {}, ...input });
  });

  it.each(["Hunter/class-only", "Hunter/profs", "Hunter/profs-alt-points-spread"])(
    "shows what the backend computes for %s",
    (caseName) => {
      const state = caseName === "Hunter/class-only" ? sheetForClass(hunter) : choose(sheetForClass(hunter), hunter, caseName);
      const shown = withLivePreview(state, hunter);
      // os lotes de arma da classe já contam como distribuídos: sem armas escolhidas
      // a prévia é a do back com todas escolhidas
      const expected = expectedFor(caseName === "Hunter/class-only" ? "Hunter/profs" : caseName);

      for (const field of [
        "characterExp", "abilities", "physicalAttributes", "mentalAttributes", "spiritualAttributes",
        "physicalSkills", "spiritualSkills", "principles", "jointProficiencies", "status",
      ] as const) {
        expect(shown[field], field).toEqual(expected[field]);
      }
      // os valores vêm do back; a grafia das chaves é a que os slots já usam
      expect(Object.keys(shown.commonProficiencies).sort()).toEqual(Object.keys(state.commonProficiencies).sort());
    },
  );

  it("counts the class weapon lots from the start, whichever weapons are chosen", () => {
    const none = withLivePreview(sheetForClass(hunter), hunter);
    const one = sheetForClass(hunter);
    one.commonProficiencies.Bow = { exp: 127, level: 3 };
    const all = choose(sheetForClass(hunter), hunter, "Hunter/profs");
    const other = sheetForClass(hunter);
    other.commonProficiencies.Longbow = { exp: 127, level: 3 };
    other.commonProficiencies.Bow = { exp: 127, level: 3 };
    const shownFields = (s: CharacterSheet) => ({
      characterExp: s.characterExp,
      abilities: s.abilities,
      physicalAttributes: s.physicalAttributes,
      physicalSkills: s.physicalSkills,
      status: s.status,
    });
    const reference = shownFields(none);
    expect(shownFields(withLivePreview(one, hunter))).toEqual(reference);
    expect(shownFields(withLivePreview(all, hunter))).toEqual(reference);
    expect(shownFields(withLivePreview(other, hunter))).toEqual(reference);
    const expected = expectedFor("Hunter/profs");
    expect(none.characterExp).toEqual(expected.characterExp);
    expect(none.abilities).toEqual(expected.abilities);
    // a arma de enfeite não aparece, nem vai no envio
    expect(Object.keys(none.commonProficiencies)).toEqual(Object.keys(sheetForClass(hunter).commonProficiencies));
    expect(buildSheetInput(sheetForClass(hunter), hunter).proficienciesExps).toEqual({});
  });

  it("keeps the page state untouched and skips the preview without a class definition", () => {
    const state = sheetForClass(hunter);
    const snapshot = structuredClone(state);
    withLivePreview(state, hunter);
    expect(state).toEqual(snapshot);
    expect(withLivePreview(state, { ...hunter, definition: undefined })).toBe(state);
  });

  it("rejects overspent attribute points like the backend", () => {
    const sheet = choose(sheetForClass(hunter), hunter, "Hunter/profs-alt-points-spread");
    sheet.physicalAttributes.sense = { ...sheet.physicalAttributes.sense, points: 1 };
    expect(validateCharacterSheet(sheet, [hunter])).toMatch(/além do disponível/);
  });
});
