import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RulesMarkdown from "../RulesMarkdown";
import { sheetRulesFixture } from "../../../test/fixtures/rules";

// Simula o chunk da fórmula falhando ao carregar: o import dinâmico rejeita.
vi.mock("../MathBlock", () => {
  throw new Error("chunk load failed");
});

describe("RulesMarkdown math chunk failure", () => {
  it("falls back to the LaTeX source and keeps the rest of the chapter", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const chapter = { ...sheetRulesFixture[0], markdown: "Antes\n\n```math\nf(n) = 1\n```\n\nDepois" };
    const { container } = render(<RulesMarkdown chapter={chapter} onNavigate={() => {}} />);
    await waitFor(() => expect(container.querySelector("pre code")!.textContent).toContain("f(n) = 1"));
    expect(screen.getByText("Antes")).toBeInTheDocument();
    expect(screen.getByText("Depois")).toBeInTheDocument();
  });
});
