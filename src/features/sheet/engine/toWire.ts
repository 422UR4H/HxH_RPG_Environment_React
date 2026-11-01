// Espelho de NewCharacterSheetResponse (internal/app/api/sheet/character_sheet_response.go).
import type { Exp } from "./experience";
import type { SheetModel } from "./buildSheet";
import type { ExperienceWire, SheetWire } from "./types";

function experience(exp: Exp): ExperienceWire {
  return {
    level: exp.getLevel(),
    exp: exp.getPoints(),
    currExp: exp.getCurrentExp(),
    nextLvlBaseExp: exp.getNextLvlBaseExp(),
  };
}

function mapValues<V, R>(map: Map<string, V>, fn: (value: V) => R): Record<string, R> {
  const out: Record<string, R> = {};
  for (const [key, value] of map) out[key] = fn(value);
  return out;
}

export function toWire(sheet: SheetModel): SheetWire {
  const bar = (b: SheetModel["status"]["health"]) => ({ min: b.min, current: b.current, max: b.max });

  return {
    characterClass: sheet.characterClass,
    categoryName: "", // sem hexágono Nen não há categoria
    characterExp: {
      ...experience(sheet.characterExp.exp),
      points: sheet.characterExp.getCharacterPoints(),
    },
    talent: experience(sheet.talent.exp),
    abilities: mapValues(sheet.abilities, (a) => ({ ...experience(a.exp), bonus: a.getBonus() })),
    physicalAttributes: mapValues(sheet.physicalAttributes, (a) => ({
      ...experience(a.exp),
      points: a.getPoints(),
      value: a.getValue(),
      power: a.getPower(),
    })),
    mentalAttributes: mapValues(sheet.mentalAttributes, (a) => ({
      ...experience(a.exp),
      points: a.getPoints(),
      value: a.getValue(),
      power: a.getPower(),
    })),
    spiritualAttributes: mapValues(sheet.spiritualAttributes, (a) => ({
      ...experience(a.exp),
      power: a.getPower(),
    })),
    physicalSkills: mapValues(sheet.physicalSkills.skills, (s) => ({
      ...experience(s.exp),
      value: s.getValueForTest(),
    })),
    mentalSkills: mapValues(sheet.mentalSkills.skills, (s) => ({
      ...experience(s.exp),
      value: s.getValueForTest(),
    })),
    spiritualSkills: mapValues(sheet.spiritualSkills.skills, (s) => ({
      ...experience(s.exp),
      value: s.getValueForTest(),
    })),
    principles: mapValues(sheet.principles, (p) => ({
      ...experience(p.exp),
      value: p.getValueForTest(),
    })),
    categories: mapValues(sheet.categories, (c) => ({
      ...experience(c.exp),
      value: c.getValueForTest(),
      percent: c.getPercent(),
    })),
    commonProficiencies: mapValues(sheet.proficiencies.commons, (p) => experience(p.exp)),
    jointProficiencies: mapValues(sheet.proficiencies.joints, (p) => ({
      ...experience(p.exp),
      weapons: [...p.weapons],
    })),
    status: {
      health: bar(sheet.status.health),
      stamina: bar(sheet.status.stamina),
      aura: bar(sheet.status.aura),
    },
  };
}
