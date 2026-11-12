import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
