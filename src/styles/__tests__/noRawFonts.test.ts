import { describe, expect, it } from "vitest";
import { lerCssReset } from "../../test/lerCssReset";
import { fonts } from "../tokens";

/**
 * Guardião de fonte. A família é declarada uma vez só, no body (ResetStyle), via `fonts.sans`.
 * Componente que precisa de fonte de título usa `fonts.display`; nunca escreve o nome da fonte.
 */

const sources = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

// Zona pixel-tuned (src/components/CLAUDE.md): valores ajustados à mão, não normalizar.
const PIXEL_TUNED = [
  "/src/components/molecules/CharacterSheetHeader.tsx",
  "/src/features/sheet/MentalsDiagram.tsx",
  "/src/features/sheet/PhysicalsDiagram.tsx",
  "/src/features/sheet/NenPrinciplesDiagram.tsx",
];

// O rótulo do ProgressBar aparece dentro dos cards da zona pixel-tuned e é reescrito depois.
const EXEMPT_EXTRA = ["/src/styles/tokens.ts", "/src/components/ions/ProgressBar.tsx"];

const isExempt = (path: string) =>
  path.includes("/__tests__/") ||
  path.startsWith("/src/test/") ||
  /\.test\.tsx?$/.test(path) ||
  PIXEL_TUNED.includes(path) ||
  EXEMPT_EXTRA.includes(path);

describe("fonte só é declarada no body", () => {
  it("nenhum arquivo fora de tokens.ts e da zona pixel-tuned escreve Roboto, Oswald ou Lato", () => {
    const found: string[] = [];
    for (const [path, raw] of Object.entries(sources)) {
      if (isExempt(path)) continue;
      raw.split("\n").forEach((line, i) => {
        const m = line.match(/["'](?:Roboto|Oswald|Lato)["']/);
        if (m) found.push(`${path}:${i + 1}  ${m[0]}`);
      });
    }
    expect(
      found,
      `Fonte vem do body (ResetStyle). Use \`fonts.display\` só para o papel de título; a sans é herdada.\n\n${found.join("\n")}\n`,
    ).toEqual([]);
  });

  it("o reset não declara Lato", () => {
    expect(sources["/src/styles/ResetStyle.ts"]).not.toMatch(/Lato/);
  });

  it("o CSS do reset declara a fonte no body e os controles a herdam; o * não declara", () => {
    const css = lerCssReset();
    expect(css).toMatch(new RegExp(`body\\{[^}]*font-family:${fonts.sans.replace(/\s+/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    expect(css).toContain("button,input,select,textarea,optgroup{font-family:inherit;}");
    const universal = css.match(/(?:^|[}>/])\*\{([^}]*)\}/);
    expect(universal).not.toBeNull();
    expect(universal![1]).not.toContain("font-family");
  });
});
