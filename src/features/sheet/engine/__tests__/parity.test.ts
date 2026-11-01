import { describe, expect, it } from "vitest";
import { computeSheet } from "../index";
import type { ClassDefinition, SheetInput } from "../index";
import { COEFF } from "../constants";
import { expTableFor, MAX_LVL } from "../experience";

// Fixture gerada pelo back (HxH_RPG_System, internal/app/api/sheet/sheet_parity_test.go)
// e copiada por `npm run sync:sheet-fixtures`. Lida como texto para não entrar no bundle.
const raw = import.meta.glob("../__fixtures__/sheet_parity.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

interface ParityFile {
  constants: Record<string, number>;
  expTables: Record<string, number[]>;
  classes: Record<string, { definition: ClassDefinition }>;
  cases: { name: string; class: string; input: SheetInput; expected: Record<string, unknown> }[];
}

const fixture = JSON.parse(Object.values(raw)[0]) as ParityFile;

const SYNC_HINT =
  "O motor TS divergiu do back. Se o back mudou de propósito, ajuste o motor; " +
  "se a fixture está velha, rode `npm run sync:sheet-fixtures`.";

describe("sheet engine parity with the Go backend", () => {
  it("uses the same coefficients as the backend", () => {
    expect(COEFF, SYNC_HINT).toEqual(fixture.constants);
  });

  it.each(Object.entries(fixture.expTables))("builds the same exp table for coefficient %s", (coeff, expected) => {
    const table = expTableFor(Number(coeff));
    const got = Array.from({ length: MAX_LVL }, (_, lvl) => table.getAggregateExpByLvl(lvl));
    expect(got, SYNC_HINT).toEqual(expected);
  });

  it("covers every class the backend serves", () => {
    const covered = new Set(fixture.cases.map((c) => c.class));
    expect([...covered].sort()).toEqual(Object.keys(fixture.classes).sort());
  });

  it.each(fixture.cases.map((c) => [c.name, c] as const))("computes %s like the backend", (_, c) => {
    const got = computeSheet(c.class, fixture.classes[c.class].definition, c.input);
    expect(got, SYNC_HINT).toEqual(c.expected);
  });
});
