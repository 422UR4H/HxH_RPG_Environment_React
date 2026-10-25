import { describe, expect, it } from "vitest";

/**
 * Guardião de cor. Falha se aparecer cor crua fora de src/styles/.
 *
 * Por que existe: uma regra só em texto ("use tokens") já falhou — cada tarefa acabava criando um
 * token novo ou um hex solto, e as cores esquemáticas se espalharam. Aqui a regra quebra o build.
 *
 * O que fazer quando este teste falha (fluxo completo em src/styles/CLAUDE.md):
 *  1. Existe um token semântico com esse significado em `colors`? Use-o, mesmo que a cor pareça um
 *     pouco errada, e avise o usuário.
 *  2. O significado é novo, mas cabe num grupo (brand, surface, text, border, action, feedback,
 *     status, vital, map, overlay, shadow)? Crie o token semântico em src/styles/tokens.ts apontando
 *     para uma cor que JÁ está em `palette`, com um comentário dizendo o papel.
 *  3. Precisa de uma cor que não está na `palette`? PARE e pergunte ao usuário: paleta nova é
 *     decisão do designer, não de quem implementa.
 *  Transparência: use `alpha(colors.x, 0.2)`, nunca rgba cru nem sufixo hex (`${colors.x}22`).
 *  Pixi: `toPixi(colors.mapX)` (src/styles/pixi.ts), nunca 0xRRGGBB.
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

// Cor de grade do mapa é DADO persistido no backend (valor padrão de um mapa novo), não tema da UI.
const MAP_DATA_DEFAULTS = [
  "/src/features/tactical-map/defaultMap.ts",
  "/src/pages/TacticalMapDemoPage.tsx",
  "/src/features/match/combat/useActionComposerState.ts",
];

const isExempt = (path: string) =>
  path.startsWith("/src/styles/") ||
  path.startsWith("/src/test/") ||
  path.includes("/__tests__/") ||
  /\.test\.tsx?$/.test(path) ||
  PIXEL_TUNED.includes(path) ||
  MAP_DATA_DEFAULTS.includes(path);

const NAMES = "white|black|red|green|blue|gray|grey|orange|yellow|gold|silver|purple|pink|cyan|magenta";
const RULES: Array<[string, RegExp]> = [
  ["hex", /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/],
  ["rgb/hsl", /\b(?:rgba?|hsla?)\(/],
  ["0xRRGGBB", /\b0x[0-9a-fA-F]{6}\b/],
  [
    "cor por nome",
    new RegExp(
      `(?:color|background(?:-color)?|border(?:-[a-z]+)?|fill|stroke|outline(?:-color)?)\\s*:\\s*(?:["'\`]?\\s*)(?:[^;"'\`]*\\s)?(?:${NAMES})\\b`,
    ),
  ],
  ["sufixo hex de alpha", /\}[0-9a-fA-F]{2}(?![0-9a-zA-Z])/],
];

/** Tira comentários e interpolações, que não carregam cor literal. */
const strip = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
    .replace(/\$\{[^}]*\}/g, (m) => (/^\$\{colors\.[A-Za-z]+\}$/.test(m) ? "${C}" : "${}"))
    .replace(/url\([^)]*\)/g, "url()");

describe("cores só existem em src/styles/", () => {
  it("nenhum arquivo fora de src/styles/ usa cor crua", () => {
    const found: string[] = [];
    for (const [path, raw] of Object.entries(sources)) {
      if (isExempt(path)) continue;
      strip(raw)
        .split("\n")
        .forEach((line, i) => {
          for (const [kind, re] of RULES) {
            const m = line.match(re);
            if (!m) continue;
            if (kind === "sufixo hex de alpha" && !/\$\{C\}[0-9a-fA-F]{2}(?![0-9a-zA-Z])/.test(line)) continue;
            found.push(`${path}:${i + 1}  [${kind}]  ${m[0]}`);
          }
        });
    }
    expect(
      found,
      `Cor crua fora de src/styles/. Não crie hex/rgba/0x no componente — siga o fluxo em src/styles/CLAUDE.md:\n` +
        `1) use um token semântico de \`colors\` que já tenha esse significado; 2) significado novo? crie o token ` +
        `semântico em tokens.ts apontando para uma cor que já está em \`palette\`; 3) cor que não está na palette? ` +
        `PARE e pergunte ao usuário (palette nova é decisão do designer). Transparência: alpha(colors.x, 0.2). ` +
        `Pixi: toPixi(colors.mapX).\n\n${found.join("\n")}\n`,
    ).toEqual([]);
  });

  it("componentes não importam a palette", () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !isExempt(path) || path.includes("/__tests__/"))
      .filter(([path]) => !path.startsWith("/src/styles/"))
      .filter(([, raw]) => /import\s*\{[^}]*\bpalette\b[^}]*\}\s*from\s*"[^"]*styles\/tokens"/.test(raw))
      .map(([path]) => path);
    expect(
      offenders,
      "Só a camada semântica (`colors`) é para componentes. `palette` é interna a src/styles/ — veja src/styles/CLAUDE.md.",
    ).toEqual([]);
  });
});
