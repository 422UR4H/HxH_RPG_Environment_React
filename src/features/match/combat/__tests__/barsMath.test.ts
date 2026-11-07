import { describe, it, expect } from "vitest";
import { barScale, barTicks, barTotal, barsRows, fmt } from "../barsMath";
import type { BarsPayload } from "../combatMessages";

/** U+2212 MINUS SIGN — o mesmo caractere que `fmt` usa, não um hífen. */
const MINUS = "−";

type Row = BarsPayload["characters"][number];
const empty: Omit<Row, "characterId"> = {
  actionCarry: 0, moveCarry: 0, actionBalance: 0, moveBalance: 0, actionSpeeds: [], moveSpeeds: [],
  pendingActionSpeeds: [], pendingMoveSpeeds: [], deferredActionSpeeds: [], deferredMoveSpeeds: [],
};
const row = (over: Partial<Row> = {}): Row => ({ characterId: "c1", ...empty, ...over });
const payload = (characters: Row[], prices: BarsPayload["prices"] = { action: 9, move: 12 }): BarsPayload => ({
  seq: 1, prices, provisionalPrices: {}, characters, order: [],
});

describe("barTotal", () => {
  it("is carry plus the mean of the acted and the NEXT pending only", () => {
    // 2 + mean(10, 14) = 14; o 30 (segunda pendente) fica de fora.
    expect(barTotal(row({ actionCarry: 2, actionSpeeds: [10], pendingActionSpeeds: [14, 30] }), "action")).toBe(14);
  });

  it("a player row (no pending) is carry plus the mean of the acted", () => {
    expect(barTotal(row({ moveCarry: 1, moveSpeeds: [8, 10] }), "move")).toBe(10);
  });

  it("reads each bar on its own", () => {
    const c = row({ actionSpeeds: [20], moveSpeeds: [6] });
    expect(barTotal(c, "action")).toBe(20);
    expect(barTotal(c, "move")).toBe(6);
  });

  it("with no speed the total is the carry (nothing spent yet)", () => {
    expect(barTotal(row({ actionCarry: 3 }), "action")).toBe(3);
    expect(barTotal(row({ actionCarry: -2 }), "action")).toBe(-2);
  });

  it("is undefined with no speed and no carry", () => {
    expect(barTotal(row(), "action")).toBeUndefined();
    // Adiada não entra: abre no próximo round.
    expect(barTotal(row({ deferredActionSpeeds: [9] }), "action")).toBeUndefined();
  });
});

describe("barScale", () => {
  it("is the largest max(total, price) among the rows", () => {
    const rows = [row({ actionSpeeds: [15] }), row({ characterId: "c2", actionSpeeds: [21] })];
    expect(barScale(rows, payload(rows), "action")).toBe(21);
  });

  it("falls back to the price when every total is below it", () => {
    const rows = [row({ actionSpeeds: [4] })];
    expect(barScale(rows, payload(rows), "action")).toBe(9);
  });

  it("uses the provisional price too", () => {
    const rows = [row()];
    expect(barScale(rows, { ...payload(rows, {}), provisionalPrices: { move: 11 } }, "move")).toBe(11);
  });

  it("without price is the largest total, and 0 with nothing", () => {
    const rows = [row({ moveSpeeds: [7] })];
    expect(barScale(rows, payload(rows, {}), "move")).toBe(7);
    expect(barScale([row()], payload([row()], {}), "move")).toBe(0);
  });
});

describe("barTicks", () => {
  it("one tick per price multiple strictly inside the scale", () => {
    expect(barTicks(9, 21)).toEqual([9, 18]);
    // Na borda não desenha: o fim da barra já marca.
    expect(barTicks(9, 18)).toEqual([9]);
    expect(barTicks(9, 9)).toEqual([]);
  });

  it("draws nothing without a positive price", () => {
    expect(barTicks(undefined, 20)).toEqual([]);
    expect(barTicks(0, 20)).toEqual([]);
  });
});

describe("barsRows", () => {
  it("keeps a Race row that has a price but no speed", () => {
    const priced = payload([row()], { action: 14 });
    expect(barsRows(priced, "Race")).toHaveLength(1);
    expect(barsRows(priced, "Free")).toHaveLength(0);
    expect(barsRows(null, "Race")).toEqual([]);
  });

  it("drops a row with no speed and no priced bar", () => {
    const mixed = payload([row({ actionSpeeds: [16] }), row({ characterId: "c2" })], {});
    expect(barsRows(mixed, "Race").map((c) => c.characterId)).toEqual(["c1"]);
  });
});

describe("fmt", () => {
  it("a negative that rounds to zero loses the sign — there is no \"−0\"", () => {
    expect(fmt(-0.04)).toBe("0");
    expect(fmt(-0.049)).toBe("0");
  });

  it("zero is \"0\", unsigned", () => {
    expect(fmt(0)).toBe("0");
  });

  it("an integer gets no \".0\"", () => {
    expect(fmt(3)).toBe("3");
  });

  it("a real negative keeps the sign and one decimal", () => {
    expect(fmt(-2.5)).toBe(`${MINUS}2.5`);
  });
});
