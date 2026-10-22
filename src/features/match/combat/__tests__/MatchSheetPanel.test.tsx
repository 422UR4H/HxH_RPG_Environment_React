import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import MatchSheetPanel from "../MatchSheetPanel";
import { renderWithProviders } from "../../../../test/render";

describe("MatchSheetPanel", () => {
  it("sem sheet escolhida, só a dica", () => {
    renderWithProviders(<MatchSheetPanel token="t" sheetUuid={undefined} />);
    expect(screen.getByText(/Toque num personagem/)).toBeInTheDocument();
  });

  it("o texto vazio é configurável (mestre)", () => {
    renderWithProviders(<MatchSheetPanel token="t" sheetUuid={undefined} emptyHint="Toque numa peça." />);
    expect(screen.getByText("Toque numa peça.")).toBeInTheDocument();
    expect(screen.queryByText(/Toque num personagem/)).not.toBeInTheDocument();
  });

  it("com sheet: sem cabeçalho de nickname nem botão de fechar a ficha", () => {
    renderWithProviders(<MatchSheetPanel token="t" sheetUuid="c1" />);
    expect(screen.getByTestId("match-sheet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fechar ficha" })).not.toBeInTheDocument();
  });
});
