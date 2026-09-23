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
