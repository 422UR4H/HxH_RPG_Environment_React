import { describe, expect, it } from "vitest";
import type { Element, Root } from "hast";
import {
  classifyBlockquote,
  headingId,
  parseDiagramFence,
  rehypeTableLabels,
  resolveDocLink,
  slugify,
} from "../markdownMapping";
import { describePaint } from "../../diagrams/describePaint";

const el = (tagName: string, children: Element["children"] = []): Element => ({
  type: "element",
  tagName,
  properties: {},
  children,
});
const text = (value: string) => ({ type: "text" as const, value });

describe("slugify and headingId", () => {
  it("strips accents and joins words with dashes", () => {
    expect(slugify("Distribuição de Pontos")).toBe("distribuicao-de-pontos");
    expect(slugify("  Visão Geral!  ")).toBe("visao-geral");
    expect(slugify("Distribuição-de-Pontos")).toBe("distribuicao-de-pontos");
  });

  it("prefixes the heading slug with the chapter slug", () => {
    expect(headingId("atributos", "Visão Geral")).toBe("atributos--visao-geral");
  });
});

describe("resolveDocLink", () => {
  it("resolves relative doc links to a slug", () => {
    expect(resolveDocLink("../classes.md")).toEqual({ slug: "classes" });
    expect(resolveDocLink("pericias.md")).toEqual({ slug: "pericias" });
  });

  it("slugifies the anchor", () => {
    expect(resolveDocLink("./atributos.md#Distribuição-de-Pontos")).toEqual({
      slug: "atributos",
      anchor: "distribuicao-de-pontos",
    });
  });

  it("does not throw on a malformed anchor", () => {
    expect(() => resolveDocLink("./x.md#100%")).not.toThrow();
    expect(resolveDocLink("./x.md#100%")).toEqual({ slug: "x", anchor: "100" });
  });

  it("returns null for anything that is not a relative doc link", () => {
    expect(resolveDocLink("https://x.y")).toBeNull();
    expect(resolveDocLink("https://x.y/a.md")).toBeNull();
    expect(resolveDocLink("#visao-geral")).toBeNull();
    expect(resolveDocLink("/docs/a.md")).toBeNull();
  });
});

describe("parseDiagramFence", () => {
  it("reads the name and the paint", () => {
    expect(parseDiagramFence("diagram", "physical paint=RES,AGI")).toEqual({
      name: "physical",
      paintRaw: "RES,AGI",
    });
    expect(parseDiagramFence("diagram", "attribute-node")).toEqual({ name: "attribute-node" });
  });

  it("returns null for other languages or unknown names", () => {
    expect(parseDiagramFence("js", "")).toBeNull();
    expect(parseDiagramFence(undefined, undefined)).toBeNull();
    expect(parseDiagramFence("diagram", "unknown")).toBeNull();
    expect(parseDiagramFence("diagram", undefined)).toBeNull();
  });
});

describe("classifyBlockquote", () => {
  it("covers formula, note and plain", () => {
    expect(classifyBlockquote({ firstStrong: false, onlyEmphasis: true })).toBe("formula");
    expect(
      classifyBlockquote({ firstStrong: true, onlyEmphasis: false, equalsAfterStrong: true }),
    ).toBe("formula");
    expect(classifyBlockquote({ firstStrong: true, onlyEmphasis: false })).toBe("note");
    expect(classifyBlockquote({ firstStrong: false, onlyEmphasis: false })).toBe("plain");
  });
});

describe("rehypeTableLabels", () => {
  it("adds the column header as data-label to every td", () => {
    const tree: Root = {
      type: "root",
      children: [
        el("table", [
          el("thead", [el("tr", [el("th", [text("Atributo")]), el("th", [text("Sigla")])])]),
          el("tbody", [
            el("tr", [el("td", [text("Força")]), el("td", [text("Str")])]),
            el("tr", [el("td", [text("Agilidade")]), el("td", [text("AGI")])]),
          ]),
        ]),
      ],
    };
    rehypeTableLabels()(tree);
    const tds: Element[] = [];
    const walk = (n: Root | Element) =>
      n.children.forEach((c) => {
        if (c.type !== "element") return;
        if (c.tagName === "td") tds.push(c);
        walk(c);
      });
    walk(tree);
    expect(tds).toHaveLength(4);
    expect(tds.map((td) => td.properties.dataLabel)).toEqual([
      "Atributo",
      "Sigla",
      "Atributo",
      "Sigla",
    ]);
  });
});

describe("describePaint", () => {
  it("names the painted nodes in Portuguese", () => {
    expect(describePaint("physical", { nodes: ["RES", "AGI", "Str"], segments: [] })).toBe(
      "Diagrama físico com destaque em Resistência, Agilidade e Força",
    );
    expect(describePaint("mental", "all")).toBe("Diagrama mental com todos os atributos acesos");
    expect(describePaint("nen-principles", { nodes: [], segments: [["Ten", "Shu"]] })).toBe(
      "Diagrama dos princípios Nen com destaque na ligação entre Ten e Shu",
    );
  });
});
