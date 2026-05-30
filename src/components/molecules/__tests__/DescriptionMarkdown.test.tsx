import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DescriptionMarkdown from "../DescriptionMarkdown";

describe("DescriptionMarkdown", () => {
  it("renders default empty text when source is empty string", () => {
    render(<DescriptionMarkdown source="" />);
    expect(screen.getByText("Sem background registrado.")).toBeInTheDocument();
  });

  it("renders custom empty text when source is empty and emptyText is set", () => {
    render(<DescriptionMarkdown source="" emptyText="Vazio." />);
    expect(screen.getByText("Vazio.")).toBeInTheDocument();
  });

  it("renders bold markdown", () => {
    render(<DescriptionMarkdown source="**hello world**" />);
    const strong = screen.getByText("hello world");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders GFM table (remark-gfm enabled)", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    render(<DescriptionMarkdown source={md} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1" })).toBeInTheDocument();
  });
});
