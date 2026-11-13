import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RulesMarkdown from "../RulesMarkdown";
import { sheetRulesFixture } from "../../../test/fixtures/rules";
import type { RuleChapter } from "../../../types/rules";

const atributos = sheetRulesFixture.find((c) => c.slug === "atributos")!;
const slugs = sheetRulesFixture.map((c) => c.slug);
const chapterWith = (markdown: string): RuleChapter => ({ ...atributos, markdown });

afterEach(() => vi.restoreAllMocks());

describe("RulesMarkdown", () => {
  it("prefixes heading ids with the chapter slug", () => {
    render(<RulesMarkdown chapter={atributos} onNavigate={() => {}} />);
    const heading = screen.getByRole("heading", { name: "Visão Geral" });
    expect(heading.id).toBe("atributos--visao-geral");
    // O título do capítulo é h2 no painel; o ## do corpo desce para h3.
    expect(heading.tagName).toBe("H3");
    expect(screen.getByRole("heading", { name: "Distribuição de Pontos" }).id).toBe(
      "atributos--distribuicao-de-pontos",
    );
  });

  it("routes a cross-doc anchor link to onNavigate", () => {
    const onNavigate = vi.fn();
    render(<RulesMarkdown chapter={atributos} chapterSlugs={slugs} onNavigate={onNavigate} />);
    const link = screen.getByRole("link", { name: "pontos" });
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false);
    expect(onNavigate).toHaveBeenCalledWith("atributos", "distribuicao-de-pontos");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens links outside the chapters in a new tab", () => {
    const onNavigate = vi.fn();
    render(
      <RulesMarkdown
        chapter={chapterWith("[site](https://x.y) e [dev](../../dev/a.md) e [p](pericias.md)")}
        chapterSlugs={["pericias"]}
        onNavigate={onNavigate}
      />,
    );
    for (const name of ["site", "dev"]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    fireEvent.click(screen.getByRole("link", { name: "p" }));
    expect(onNavigate).toHaveBeenCalledWith("pericias", undefined);
  });

  it("renders a diagram fence as a lit diagram with a Portuguese label", () => {
    const { container } = render(<RulesMarkdown chapter={atributos} onNavigate={() => {}} />);
    const figure = screen.getByRole("img", {
      name: "Diagrama físico com destaque em Resistência, Agilidade e Força",
    });
    expect(figure.querySelectorAll("[data-glow-layer]")).toHaveLength(4);
    // A meta chegou: o bloco ASCII não foi desenhado.
    expect(container.querySelector("pre")).toBeNull();
  });

  it("keeps the diagram mounted when onNavigate and chapterSlugs change identity", () => {
    const first = vi.fn();
    const { rerender } = render(
      <RulesMarkdown chapter={atributos} chapterSlugs={[...slugs]} onNavigate={(s, a) => first(s, a)} />,
    );
    const diagram = screen.getByRole("img");
    const latest = vi.fn();
    rerender(<RulesMarkdown chapter={atributos} chapterSlugs={[...slugs]} onNavigate={(s, a) => latest(s, a)} />);
    expect(screen.getByRole("img")).toBe(diagram);
    fireEvent.click(screen.getByRole("link", { name: "pontos" }));
    expect(latest).toHaveBeenCalledWith("atributos", "distribuicao-de-pontos");
    expect(first).not.toHaveBeenCalled();
  });

  it("renders the attribute-node figure", () => {
    render(<RulesMarkdown chapter={chapterWith("```diagram attribute-node\nAGI\n```")} onNavigate={() => {}} />);
    expect(screen.getByText("AGI")).toBeInTheDocument();
    expect(screen.getByText("Nível")).toBeInTheDocument();
    expect(screen.getByText("Sobe com a experiência.")).toBeInTheDocument();
    expect(screen.getByText("Os seus: + põe, − tira.")).toBeInTheDocument();
    expect(screen.getByText("O que conta nos testes.")).toBeInTheDocument();
  });

  it("falls back to the ASCII block for an unknown diagram or bad paint", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const fence of ["diagram unknown", "diagram physical paint=XYZ"]) {
      const { container, unmount } = render(
        <RulesMarkdown chapter={chapterWith(`\`\`\`${fence}\n  RES\n AGI-Str\n\`\`\``)} onNavigate={() => {}} />,
      );
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(pre!.textContent).toContain("AGI-Str");
      expect(screen.queryByRole("img")).toBeNull();
      unmount();
    }
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("marks formula and note blockquotes", () => {
    const { container } = render(
      <RulesMarkdown
        chapter={chapterWith(
          [
            "> *valor = pontos + nível*",
            "",
            "> **Valor de Teste** = nível + poder",
            "",
            "> **Nota:** só com Nen.",
            "",
            "> Sistema de classes.",
          ].join("\n"),
        )}
        onNavigate={() => {}}
      />,
    );
    const quotes = [...container.querySelectorAll("blockquote")];
    expect(quotes.map((q) => q.className.split(" ").find((c) => c.startsWith("md-")) ?? "")).toEqual([
      "md-formula",
      "md-formula",
      "md-note",
      "",
    ]);
  });

  it("wraps tables and labels the cells", () => {
    const { container } = render(<RulesMarkdown chapter={atributos} onNavigate={() => {}} />);
    const table = container.querySelector("table")!;
    expect(table.parentElement!.className).toContain("md-table");
    expect([...table.querySelectorAll("td")].map((td) => td.dataset.label)).toEqual([
      "Atributo",
      "Sigla",
      "Atributo",
      "Sigla",
    ]);
  });
});

describe("RulesMarkdown coming-soon badge", () => {
  const render1 = (md: string) =>
    render(<RulesMarkdown chapter={chapterWith(md)} onNavigate={() => {}} />);

  it("renders the badge inside a list item", () => {
    render1("- Mago (em breve)");
    const li = screen.getByRole("listitem");
    expect(li.textContent).toContain("Mago");
    expect(li.textContent).toContain("Em breve");
    expect(li.textContent).not.toContain("(em breve)");
  });

  it("renders the badge inside a table cell", () => {
    const { container } = render1("| A | B |\n|---|---|\n| Mago (em breve) | x |");
    expect(container.querySelector("td")!.textContent).toContain("Em breve");
  });

  it("leaves text without the marker untouched", () => {
    const { container } = render1("Texto comum em breve.");
    expect(container.textContent).toBe("Texto comum em breve.");
  });

  it("does not touch a code span", () => {
    const { container } = render1("`(em breve)`");
    expect(container.querySelector("code")!.textContent).toBe("(em breve)");
  });
});

describe("RulesMarkdown math fences", () => {
  const render1 = (md: string) =>
    render(<RulesMarkdown chapter={chapterWith(md)} onNavigate={() => {}} />);

  it("renders a math fence as a MathML element", async () => {
    const { container } = render1("```math\nf(n) = \\frac{1}{1 + e^{n}}\n```");
    await waitFor(() => expect(container.querySelector("math")).not.toBeNull());
  });

  it("falls back to the source when the LaTeX is invalid", async () => {
    const { container } = render1("```math\n\\frac{1\n```");
    await waitFor(() => expect(container.querySelector("pre code")!.textContent).toContain("\\frac{1"));
    expect(container.querySelector("math")).toBeNull();
  });

  it("keeps a normal code fence unchanged", () => {
    const { container } = render1("```\nabc\n```");
    expect(container.querySelector("pre code")!.textContent).toContain("abc");
    expect(container.querySelector("math")).toBeNull();
  });
});

describe("RulesMarkdown badge and math edge cases", () => {
  const render1 = (md: string) =>
    render(<RulesMarkdown chapter={chapterWith(md)} onNavigate={() => {}} />);

  it("keeps the badge out of the heading id and renders it inside the heading", () => {
    render1("## Categorias Nen (em breve)");
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.id.endsWith("--categorias-nen")).toBe(true);
    expect(heading.textContent).toContain("Em breve");
  });

  it("renders one badge per marker in the same text", () => {
    const { container } = render1("A (em breve) e B (em breve)");
    expect(container.textContent!.match(/Em breve/g)).toHaveLength(2);
  });

  it("renders math inside a note blockquote and keeps the note class", async () => {
    const { container } = render1("> **🔍 Curiosidade — x**\n>\n> ```math\n> f(n) = \\frac{1}{n}\n> ```");
    await waitFor(() => expect(container.querySelector("math")).not.toBeNull());
    expect(container.querySelector("blockquote")!.className).toContain("md-note");
  });
});

describe("RulesMarkdown multi-line math", () => {
  it("renders an aligned multi-line formula as MathML table without falling back", async () => {
    const md = "```math\n\\begin{aligned}\nf(n) &= \\frac{1}{1 + e^{n}} \\\\\n&+ \\frac{2}{1 + e^{n}}\n\\end{aligned}\n```";
    const { container } = render(<RulesMarkdown chapter={chapterWith(md)} onNavigate={() => {}} />);
    await waitFor(() => expect(container.querySelector("math")).not.toBeNull());
    expect(container.querySelector("math mtable")).not.toBeNull();
    expect(container.querySelector("pre")).toBeNull();
  });
});
