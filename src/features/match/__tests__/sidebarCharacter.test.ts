import { describe, it, expect } from "vitest";
import { toSidebarCharacter } from "../sidebarCharacter";

const base = {
  uuid: "c1", nickName: "Gon", avatarUrl: "a.png", coverUrl: "c.png", deadAt: "2026-01-01",
  createdAt: "", updatedAt: "",
};

describe("toSidebarCharacter", () => {
  it("participante sem private: a base inteira, sem vida", () => {
    const c = toSidebarCharacter({ ...base, playerUuid: "u2" });
    expect(c).toMatchObject({ uuid: "c1", nickName: "Gon", avatarUrl: "a.png", coverUrl: "c.png", deadAt: "2026-01-01", playerUuid: "u2" });
    expect(c.health).toBeUndefined();
  });

  it("participante com private: mescla", () => {
    const health = { min: 0, current: 50, max: 100 };
    const stamina = { min: 0, current: 10, max: 10 };
    const c = toSidebarCharacter({ ...base, private: { fullName: "Gon Freecss", health, stamina, level: 3 } as never });
    expect(c).toMatchObject({ fullName: "Gon Freecss", health, level: 3, nickName: "Gon" });
  });

  it("CharacterPrivateSummary plano passa como está", () => {
    const health = { min: 0, current: 5, max: 9 };
    const c = toSidebarCharacter({ ...base, health, stamina: health, fullName: "X" } as never);
    expect(c.health).toEqual(health);
  });
});
