import { describe, expect, it } from "vitest";
import { createEmptyCharacterSheet } from "../factories/characterSheet.factory";
import { validateCharacterSheet } from "../utils/validateCharacterSheet";

function sheetWith(profile: Partial<ReturnType<typeof createEmptyCharacterSheet>["profile"]>) {
  const sheet = createEmptyCharacterSheet();
  return { ...sheet, profile: { ...sheet.profile, ...profile } };
}

describe("validateCharacterSheet text limits", () => {
  it("counts an astral (non-emoji) character as one character in the nickname", () => {
    const atLimit = validateCharacterSheet(sheetWith({ nickname: "𝒜".repeat(10) }), []);
    expect(atLimit ?? "").not.toMatch(/Nickname/);
    const overLimit = validateCharacterSheet(sheetWith({ nickname: "𝒜".repeat(11) }), []);
    expect(overLimit).toMatch(/Nickname deve ter entre 3 e 10/);
  });

  it("counts an astral (non-emoji) character as one character in the full name", () => {
    const atLimit = validateCharacterSheet(sheetWith({ fullname: "𝒜".repeat(32) }), []);
    expect(atLimit ?? "").not.toMatch(/Nome completo/);
    const overLimit = validateCharacterSheet(sheetWith({ fullname: "𝒜".repeat(33) }), []);
    expect(overLimit).toMatch(/Nome completo deve ter entre 6 e 32/);
  });

  it("counts an astral character as one character in the brief description", () => {
    const atLimit = validateCharacterSheet(sheetWith({ briefDescription: "😀".repeat(255) }), []);
    expect(atLimit ?? "").not.toMatch(/Descrição breve/);
    const overLimit = validateCharacterSheet(sheetWith({ briefDescription: "😀".repeat(256) }), []);
    expect(overLimit).toMatch(/Descrição breve deve ter no máximo 255/);
  });

  it("keeps trimming the nickname before counting", () => {
    const result = validateCharacterSheet(sheetWith({ nickname: "  ab  " }), []);
    expect(result).toMatch(/Nickname/);
  });

  it.each([["start", "😀Gon"], ["middle", "Go😀n"], ["end", "Gon😀"]])(
    "rejects an emoji at the %s of the nickname and the full name",
    (_pos, text) => {
      expect(validateCharacterSheet(sheetWith({ nickname: text }), [])).toMatch(
        /Nickname: Emojis não são permitidos neste campo\./,
      );
      expect(validateCharacterSheet(sheetWith({ fullname: `Gon ${text}` }), [])).toMatch(
        /Nome completo: Emojis não são permitidos neste campo\./,
      );
    },
  );

  it("accepts accented text in the nickname and the full name", () => {
    const result = validateCharacterSheet(sheetWith({ nickname: "José", fullname: "José Ção" }), []);
    expect(result ?? "").not.toMatch(/Emojis/);
  });

  it("still accepts an emoji in the brief description, counted as one", () => {
    const result = validateCharacterSheet(sheetWith({ briefDescription: "😀".repeat(255) }), []);
    expect(result ?? "").not.toMatch(/Emojis|Descrição breve/);
  });
});
