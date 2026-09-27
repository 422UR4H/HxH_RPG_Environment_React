import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchStageTemplate from "../MatchStageTemplate";

// jsdom não avalia media query contra layout: a disposição por largura só se verifica no
// browser. Aqui fica o contrato das zonas.
describe("MatchStageTemplate", () => {
  it("renders every zone it is given", () => {
    render(
      <MatchStageTemplate
        topbar={<div>topbar-zone</div>}
        rail={<div>rail-zone</div>}
        panel={<div>panel-zone</div>}
        stage={<div>stage-zone</div>}
        aside={<div>aside-zone</div>}
      />,
    );
    ["topbar", "rail", "panel", "stage", "aside"].forEach((z) =>
      expect(screen.getByText(`${z}-zone`)).toBeInTheDocument(),
    );
  });

  it("omits the panel and the aside when they are not given", () => {
    render(<MatchStageTemplate topbar={<div />} rail={<div />} stage={<div>stage-zone</div>} />);
    expect(screen.getByText("stage-zone")).toBeInTheDocument();
    expect(screen.queryByTestId("match-panel")).toBeNull();
    expect(screen.queryByTestId("match-aside")).toBeNull();
  });

  it("defaults panelOpen/asideOpen to true and reflects false", () => {
    const { rerender } = render(
      <MatchStageTemplate
        topbar={<div />}
        rail={<div />}
        panel={<div>panel-zone</div>}
        stage={<div />}
        aside={<div>aside-zone</div>}
      />,
    );
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("match-aside")).toHaveAttribute("data-open", "true");

    rerender(
      <MatchStageTemplate
        topbar={<div />}
        rail={<div />}
        panel={<div>panel-zone</div>}
        stage={<div />}
        aside={<div>aside-zone</div>}
        panelOpen={false}
        asideOpen={false}
      />,
    );
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("match-aside")).toHaveAttribute("data-open", "false");
  });

  // O painel nunca pode cobrir o mapa nem o rail no celular: é uma linha da grade entre os
  // dois, não uma camada fixa por cima.
  it("stacks stage, panel and rail as grid rows below railUp — the panel pushes, never covers", () => {
    render(
      <MatchStageTemplate topbar={<div />} rail={<div />} panel={<div />} stage={<div />} />,
    );
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    expect(css).toContain('grid-template-areas:"stage" "panel" "rail";');
    expect(css).not.toMatch(/position:fixed/);
  });
});
