import { describe, expect, it } from "vitest";

// O motor precisa poder sair desta pasta e virar biblioteca (compartilhada ou
// publicada) sem reescrita: por isso só importa arquivos da própria pasta.
const sources = import.meta.glob(["../*.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const IMPORT_RE = /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']/g;

describe("sheet engine boundary", () => {
  it.each(Object.entries(sources))("%s imports only from inside the engine", (_, code) => {
    const outside = [...code.matchAll(IMPORT_RE)]
      .map((m) => m[1])
      .filter((spec) => !spec.startsWith("./"));
    expect(outside, "o motor não pode importar de fora de src/features/sheet/engine").toEqual([]);
  });
});
