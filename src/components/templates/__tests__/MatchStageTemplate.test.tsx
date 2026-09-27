import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchStageTemplate from "../MatchStageTemplate";

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

  // R24: panelOpen/asideOpen default to true (existing behavior: always shown at/above
  // the breakpoint where they become static columns) and reflect the given value otherwise.
  it("defaults panelOpen/asideOpen to true when omitted", () => {
    render(
      <MatchStageTemplate
        topbar={<div />}
        rail={<div />}
        panel={<div>panel-zone</div>}
        stage={<div>stage-zone</div>}
        aside={<div>aside-zone</div>}
      />,
    );
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("match-aside")).toHaveAttribute("data-open", "true");
  });

  // Final review, Important 4: below railUp, RailZone and PanelZone were both
  // `position: fixed; bottom: 0` stacked on the same corner — an open panel covered the
  // rail (the only close control) with no way to close it. The panel must sit ABOVE a
  // rail bar of known height, and the stage must reserve that same strip at its own
  // bottom so the map isn't hidden under the rail. jsdom doesn't evaluate media queries
  // against layout, so this reads the actual CSS styled-components injected into
  // <head> — the only way to assert this without a real browser (Pixi/canvas
  // verification is out of reach here too, per src/test/setup.ts).
  it("keeps the panel above a rail bar of known height, and reserves that height on the stage, below railUp", () => {
    render(
      <MatchStageTemplate
        topbar={<div />}
        rail={<div>rail-zone</div>}
        panel={<div>panel-zone</div>}
        stage={<div>stage-zone</div>}
      />,
    );
    const css = Array.from(document.querySelectorAll("style"))
      .map((s) => s.textContent)
      .join("\n");

    // The rail's own fixed-bottom-bar rule must declare an explicit height (any bare
    // fixed nav with no height today collapses to content height, which
    // `bottom: <that height>` on the panel can't reference in pure CSS).
    const railHeightMatch = css.match(/position:fixed;left:0;right:0;bottom:0;z-index:20;height:(\d+px);/);
    expect(railHeightMatch).not.toBeNull();
    const railBarHeight = railHeightMatch![1];

    // PanelZone (z-index:30) sits `bottom: <railBarHeight>`, not `bottom: 0` — it no
    // longer stacks on top of the rail.
    expect(css).toContain(`bottom:${railBarHeight};z-index:30;`);
    expect(css).not.toMatch(/bottom:0;z-index:30;/);

    // StageZone reserves the same strip so the map isn't hidden under the fixed rail.
    expect(css).toMatch(
      new RegExp(`grid-area:stage;position:relative;min-width:0;min-height:0;padding-bottom:${railBarHeight};`),
    );

    // At/above railUp, the rail rejoins the grid as a static column — the reserved strip
    // and the "float above rail" offset both need to go away there, or the layout would
    // carry a permanent dead gap at desktop widths.
    expect(css).toMatch(/@media \(min-width: 1024px\)\{\.\w+\{padding-bottom:0;\}\}/);
  });

  it("reflects panelOpen={false} and asideOpen={false} on the zones' data-open attribute", () => {
    render(
      <MatchStageTemplate
        topbar={<div />}
        rail={<div />}
        panel={<div>panel-zone</div>}
        stage={<div>stage-zone</div>}
        aside={<div>aside-zone</div>}
        panelOpen={false}
        asideOpen={false}
      />,
    );
    expect(screen.getByTestId("match-panel")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("match-aside")).toHaveAttribute("data-open", "false");
  });
});
