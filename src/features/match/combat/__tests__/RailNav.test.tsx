import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RailNav from "../RailNav";
import { breakpoints } from "../../../../styles/breakpoints";

describe("RailNav", () => {
  it("marca o item ativo e dispara onSelect com o id clicado", () => {
    const onSelect = vi.fn();
    render(
      <RailNav
        items={[{ id: "fila", label: "Fila" }, { id: "fichas", label: "Fichas" }]}
        active="fila"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: "Fila" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fichas" })).toHaveAttribute("aria-pressed", "false");
    screen.getByRole("button", { name: "Fichas" }).click();
    expect(onSelect).toHaveBeenCalledWith("fichas");
  });

  // F4 (B2): RailNav's <Nav> hard-coded flex-direction:row;height:100% regardless of
  // the template's own orientation — MatchStageTemplate's RailZone lays the rail out as
  // a row footer below `railUp` and a column from it on (R6: same component, CSS
  // decides), so a hard-coded row left the buttons a squeezed horizontal strip crammed
  // into the 72px-wide desktop column instead of stacking at the top.
  //
  // jsdom has no real layout engine and does not evaluate @media against
  // window.innerWidth for getComputedStyle, so the only thing a unit test can assert is
  // the CSS styled-components actually emitted — this is exactly what changed by the fix
  // (row hard-coded → inherit; NavButton stretching → fixed-size above railUp) and it is
  // what a browser resolves against RailZone's flex-direction at each width. Manual
  // verification at both widths belongs in the browser walk (report).
  it("Nav segue a orientação do container (não força row) e NavButton para de esticar a partir de railUp", () => {
    render(
      <RailNav items={[{ id: "a", label: "A" }]} active="a" onSelect={() => {}} />,
    );
    const css = document.head.innerHTML;

    // Nav: sem flex-direction/justify-content fixos — herda do RailZone.
    expect(css).toMatch(/\.\S+\{display:flex;flex-direction:inherit;justify-content:inherit;width:100%;height:100%;\}/);

    // NavButton: flex:1 (mobile, esticar igual) só até railUp; dali em diante flex:0 0 auto
    // (tamanho de conteúdo, empilha no topo em vez de esticar por toda a altura do rail).
    expect(css).toContain(`@media (min-width: ${breakpoints.railUp}px)`);
    expect(css).toMatch(new RegExp(`@media \\(min-width: ${breakpoints.railUp}px\\)\\{\\.\\S+\\{flex:0 0 auto;\\}\\}`));
  });
});
