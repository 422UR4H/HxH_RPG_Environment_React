import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RailNav from "../RailNav";

describe("RailNav", () => {
  it("marca o item ativo (com o painel aberto) e dispara onSelect com o id clicado", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <RailNav
        items={[{ id: "fila", label: "Fila" }, { id: "agir", label: "Agir" }]}
        active="fila"
        panelOpen
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "Fila" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Agir" })).toHaveAttribute("aria-pressed", "false");
    screen.getByRole("button", { name: "Agir" }).click();
    expect(onSelect).toHaveBeenCalledWith("agir");

    // Painel fechado: nenhum item aparece pressionado.
    rerender(
      <RailNav
        items={[{ id: "fila", label: "Fila" }, { id: "agir", label: "Agir" }]}
        active="fila"
        panelOpen={false}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "Fila" })).toHaveAttribute("aria-pressed", "false");
  });

  it("mostra o contador quando há badge", () => {
    render(<RailNav items={[{ id: "fila", label: "Fila", badge: 3 }]} active="fila" panelOpen onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /Fila/ })).toHaveTextContent("3");
  });

  // O mesmo componente é rodapé deitado e rail em pé: quem decide a orientação é o
  // container (MatchStageTemplate), por CSS. jsdom não avalia media query — o que dá para
  // afirmar é o CSS emitido.
  it("follows the container orientation through CSS variables instead of a media query", () => {
    render(<RailNav items={[{ id: "a", label: "A" }]} active="a" panelOpen onSelect={() => {}} />);
    const css = document.head.innerHTML;
    expect(css).toMatch(/\.\S+\{display:flex;flex-direction:inherit;justify-content:inherit;width:100%;height:100%;\}/);
    expect(css).toContain("flex:var(--rail-item-flex, 1);");
    expect(css).toContain("min-height:var(--rail-item-min-height, auto);");
  });

  it("marks an item pressed by its own pressed flag", () => {
    render(
      <RailNav
        items={[{ id: "a", label: "A" }, { id: "b", label: "B", pressed: true }]}
        active="a"
        panelOpen
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "A" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("aria-pressed", "true");
  });
});
