import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  describe("véus em tela estreita", () => {
    const base = { topbar: <div />, rail: <div />, stage: <div />, panel: <div />, aside: <div /> };

    it("véu do painel: existe com panelOpen + panelDismissible e o click o dispensa", () => {
      const onDismissPanel = vi.fn();
      render(<MatchStageTemplate {...base} panelOpen panelDismissible onDismissPanel={onDismissPanel} />);
      fireEvent.click(screen.getByTestId("panel-scrim"));
      expect(onDismissPanel).toHaveBeenCalledTimes(1);
    });

    it("não há véu do painel sem panelDismissible (o painel pede toque no mapa) nem com ele fechado", () => {
      const { rerender } = render(<MatchStageTemplate {...base} panelOpen onDismissPanel={() => {}} />);
      expect(screen.queryByTestId("panel-scrim")).toBeNull();
      rerender(<MatchStageTemplate {...base} panelOpen={false} panelDismissible onDismissPanel={() => {}} />);
      expect(screen.queryByTestId("panel-scrim")).toBeNull();
    });

    it("véu da gaveta: existe com asideOpen + onDismissAside e o click o dispensa", () => {
      const onDismissAside = vi.fn();
      render(<MatchStageTemplate {...base} asideOpen onDismissAside={onDismissAside} />);
      fireEvent.click(screen.getByTestId("aside-scrim"));
      expect(onDismissAside).toHaveBeenCalledTimes(1);
    });

    it("não há véu da gaveta fechada", () => {
      render(<MatchStageTemplate {...base} asideOpen={false} onDismissAside={() => {}} />);
      expect(screen.queryByTestId("aside-scrim")).toBeNull();
    });

    it("pointerdown nos véus não chega à window (o pan do mapa escuta lá)", () => {
      const onWindowPointerDown = vi.fn();
      window.addEventListener("pointerdown", onWindowPointerDown);
      render(
        <MatchStageTemplate
          {...base}
          panelOpen
          panelDismissible
          onDismissPanel={() => {}}
          asideOpen
          onDismissAside={() => {}}
        />,
      );
      fireEvent.pointerDown(screen.getByTestId("panel-scrim"));
      fireEvent.pointerDown(screen.getByTestId("aside-scrim"));
      window.removeEventListener("pointerdown", onWindowPointerDown);
      expect(onWindowPointerDown).not.toHaveBeenCalled();
    });
  });
});
