import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchStageTemplate from "../MatchStageTemplate";
import { MASTER_COLUMN_WIDTH, PLAYER_COLUMN_WIDTH } from "../MatchStageTemplate.styles";
import { colors } from "../../../styles/tokens";
import {
  asideNarrowQuery,
  LANDSCAPE_TWO_COLUMN_QUERY,
  media,
  QUEUE_COLUMN_WIDTH,
} from "../../../styles/breakpoints";

const emittedCss = () => Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");

/** O stylis tira o espaço depois da vírgula de uma lista de media queries ao emitir. */
const emitted = (atMedia: string) => atMedia.replace(/,\s+/g, ",");

/**
 * As declarações que o styled-components emitiu para o elemento, na ordem do CSS: sem
 * `atMedia`, as da regra de base; com ele, as dos blocos dessa media query.
 */
function declarationsOf(el: Element, atMedia?: string): string {
  const css = emittedCss();
  const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(el.classList)
    .flatMap((cls) => {
      const rule = atMedia
        ? new RegExp(`${escape(emitted(atMedia))}\\{\\.${cls}\\{([^}]*)\\}`, "g")
        : new RegExp(`(?:^|\\})\\s*\\.${cls}\\{([^}]*)\\}`, "g");
      return Array.from(css.matchAll(rule), (m) => m[1]);
    })
    .join("");
}

/** O valor que vence de uma propriedade numa lista de declarações (a última). */
function lastValue(declarations: string, property: string): string | undefined {
  const found = Array.from(declarations.matchAll(new RegExp(`(?:^|;)${property}:([^;]*)`, "g")));
  return found[found.length - 1]?.[1];
}

// jsdom não avalia media query contra layout: a disposição por largura só se verifica no
// browser. Aqui fica o contrato das zonas.
describe("MatchStageTemplate", () => {
  it("renders every zone it is given", () => {
    render(
      <MatchStageTemplate
        columnWidth={MASTER_COLUMN_WIDTH}
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
    render(
      <MatchStageTemplate
        columnWidth={MASTER_COLUMN_WIDTH}
        topbar={<div />}
        rail={<div />}
        stage={<div>stage-zone</div>}
      />,
    );
    expect(screen.getByText("stage-zone")).toBeInTheDocument();
    expect(screen.queryByTestId("match-panel")).toBeNull();
    expect(screen.queryByTestId("match-aside")).toBeNull();
  });

  it("defaults panelOpen/asideOpen to true and reflects false", () => {
    const { rerender } = render(
      <MatchStageTemplate
        columnWidth={MASTER_COLUMN_WIDTH}
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
        columnWidth={MASTER_COLUMN_WIDTH}
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
      <MatchStageTemplate
        columnWidth={MASTER_COLUMN_WIDTH}
        topbar={<div />}
        rail={<div />}
        panel={<div />}
        stage={<div />}
      />,
    );
    const css = Array.from(document.querySelectorAll("style")).map((s) => s.textContent).join("\n");
    expect(css).toContain('grid-template-areas:"stage" "panel" "rail";');
    expect(css).not.toMatch(/position:fixed/);
  });

  describe("véus em tela estreita", () => {
    const base = { topbar: <div />, rail: <div />, stage: <div />, panel: <div />, aside: <div />, columnWidth: MASTER_COLUMN_WIDTH };

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

  describe("queue, sheet and widths", () => {
    const base = { topbar: <div />, rail: <div />, stage: <div />, columnWidth: MASTER_COLUMN_WIDTH };

    it("renders the queue zone only when a queue is given", () => {
      const { rerender } = render(<MatchStageTemplate {...base} panel={<div />} />);
      expect(screen.queryByTestId("match-queue")).toBeNull();
      rerender(<MatchStageTemplate {...base} panel={<div />} queue={<div>queue-zone</div>} />);
      expect(screen.getByTestId("match-queue")).toHaveTextContent("queue-zone");
    });

    it("renders the sheet zone closed by default and reflects sheetOpen", () => {
      const { rerender } = render(<MatchStageTemplate {...base} sheet={<div>sheet-zone</div>} />);
      expect(screen.getByTestId("match-sheet-zone")).toHaveAttribute("data-open", "false");
      rerender(<MatchStageTemplate {...base} sheet={<div>sheet-zone</div>} sheetOpen />);
      expect(screen.getByTestId("match-sheet-zone")).toHaveAttribute("data-open", "true");
    });

    it("dismisses the sheet from the close button and from the transparent scrim", () => {
      const onDismissSheet = vi.fn();
      render(<MatchStageTemplate {...base} sheet={<div />} sheetOpen onDismissSheet={onDismissSheet} />);
      fireEvent.click(screen.getByRole("button", { name: "Fechar a ficha" }));
      fireEvent.click(screen.getByTestId("sheet-scrim"));
      expect(onDismissSheet).toHaveBeenCalledTimes(2);
    });

    it("has no sheet scrim while the sheet is closed", () => {
      render(<MatchStageTemplate {...base} sheet={<div />} onDismissSheet={() => {}} />);
      expect(screen.queryByTestId("sheet-scrim")).toBeNull();
    });

    it("stops pointerdown on the sheet scrim before it reaches the window", () => {
      const onWindowPointerDown = vi.fn();
      window.addEventListener("pointerdown", onWindowPointerDown);
      render(<MatchStageTemplate {...base} sheet={<div />} sheetOpen onDismissSheet={() => {}} />);
      fireEvent.pointerDown(screen.getByTestId("sheet-scrim"));
      window.removeEventListener("pointerdown", onWindowPointerDown);
      expect(onWindowPointerDown).not.toHaveBeenCalled();
    });

    it("splits the left column into panel and queue when a queue is given", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} />);
      expect(emittedCss()).toContain('"rail panel stage aside" "rail queue stage aside"');
    });

    it("gives the widescreen master a queue column left of the panel", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} />);
      expect(emittedCss()).toContain('"rail queue panel stage aside"');
      expect(emittedCss()).toContain("grid-template-columns:72px 240px 320px");
    });

    it("paints the master's queue with the recessed surface, without a shadow gradient", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} />);
      expect(emittedCss()).toContain(`background:${colors.surfaceRecessed};`);
      expect(emittedCss()).not.toContain(`linear-gradient(${colors.shadowSoft},${colors.shadowSoft})`);
    });


    it("lets the bottom panel and the nav run under the aside column on a portrait tablet", () => {
      render(<MatchStageTemplate {...base} panel={<div />} aside={<div />} />);
      const middle = screen.getByTestId("match-panel").parentElement!;
      expect(declarationsOf(middle, media.tabletPortrait)).toContain('"stage aside" "panel panel" "rail rail"');
    });

    it("splits the portrait phone in equal halves with panelHalf", () => {
      render(<MatchStageTemplate {...base} panel={<div />} panelHalf />);
      expect(emittedCss()).toContain("minmax(0, 1fr) minmax(0, 1fr) 56px");
    });

    it("caps the sheet box at 420 px and leaves the map 300 px", () => {
      render(<MatchStageTemplate {...base} sheet={<div />} />);
      expect(emittedCss()).toContain("clamp(340px, calc(100% - 300px), 420px)");
    });

    it("never lets the sheet box exceed the stage width", () => {
      render(<MatchStageTemplate {...base} sheet={<div />} />);
      expect(emittedCss()).toContain("max-width:100%;");
    });
  });

  describe("stacked up to 1279 px in portrait, side columns otherwise", () => {
    const base = { topbar: <div />, rail: <div />, stage: <div />, columnWidth: MASTER_COLUMN_WIDTH };

    it("lays the side grids and the upright rail under media.side, never under tabletUp or railUp", () => {
      const { container } = render(
        <MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} columnWidth={MASTER_COLUMN_WIDTH} />,
      );
      const middle = screen.getByTestId("match-panel").parentElement!;
      const rail = container.querySelector("nav")!;
      expect(declarationsOf(middle, media.side)).toContain('"rail panel stage aside" "rail queue stage aside"');
      expect(lastValue(declarationsOf(rail, media.side), "flex-direction")).toBe("column");
      for (const el of [middle, rail, screen.getByTestId("match-panel"), screen.getByTestId("match-queue")]) {
        expect(declarationsOf(el, media.tabletUp)).toBe("");
        expect(declarationsOf(el, media.railUp)).toBe("");
      }
    });

    it("uses the single-column grid for the player under media.side", () => {
      render(<MatchStageTemplate {...base} panel={<div />} aside={<div />} columnWidth={PLAYER_COLUMN_WIDTH} />);
      const middle = screen.getByTestId("match-panel").parentElement!;
      expect(declarationsOf(middle, media.side)).toContain('grid-template-areas:"rail panel stage aside";');
    });

    it("keeps the portrait tablet's panel at the bottom, without a column width", () => {
      render(<MatchStageTemplate {...base} panel={<div />} aside={<div />} columnWidth={PLAYER_COLUMN_WIDTH} />);
      expect(declarationsOf(screen.getByTestId("match-panel"), media.tabletPortrait)).toBe("");
    });

    it("shows the panel scrim only when stacked", () => {
      render(<MatchStageTemplate {...base} panel={<div />} panelOpen panelDismissible onDismissPanel={() => {}} />);
      const scrim = screen.getByTestId("panel-scrim");
      expect(lastValue(declarationsOf(scrim, media.side), "display")).toBe("none");
      expect(declarationsOf(scrim, media.tabletPortrait)).toBe("");
    });
  });

  describe("fixed column widths", () => {
    const base = { topbar: <div />, rail: <div />, stage: <div />, columnWidth: MASTER_COLUMN_WIDTH };

    it("gives the master's panel and queue the column width on side screens and the landscape phone", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} columnWidth={MASTER_COLUMN_WIDTH} />);
      const panel = screen.getByTestId("match-panel");
      const queue = screen.getByTestId("match-queue");
      expect(lastValue(declarationsOf(panel, media.side), "width")).toBe("320px");
      expect(lastValue(declarationsOf(panel, media.landscapePhone), "width")).toBe("320px");
      expect(lastValue(declarationsOf(panel, media.asideUp), "width")).toBe("320px");
      expect(lastValue(declarationsOf(queue, media.side), "width")).toBe("320px");
      expect(lastValue(declarationsOf(queue, media.landscapePhone), "width")).toBe("320px");
      expect(lastValue(declarationsOf(queue, media.wideUp), "width")).toBe("240px");
    });

    it("gives the player's panel the column width on side screens and the landscape phone", () => {
      render(<MatchStageTemplate {...base} panel={<div />} columnWidth={PLAYER_COLUMN_WIDTH} />);
      const panel = screen.getByTestId("match-panel");
      expect(lastValue(declarationsOf(panel, media.side), "width")).toBe("340px");
      expect(lastValue(declarationsOf(panel, media.asideUp), "width")).toBe("340px");
      expect(lastValue(declarationsOf(panel, media.landscapePhone), "width")).toBe("340px");
    });

    it("widens the player's sheet tab to 420 px only from asideUp", () => {
      render(<MatchStageTemplate {...base} panel={<div />} panelWide columnWidth={PLAYER_COLUMN_WIDTH} />);
      const panel = screen.getByTestId("match-panel");
      expect(lastValue(declarationsOf(panel, media.side), "width")).toBe("340px");
      expect(lastValue(declarationsOf(panel, media.asideUp), "width")).toBe("420px");
    });

    it("makes the Histórico 280 px by default and 200 px only where the map would be left under 320 px", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} />);
      const aside = screen.getByTestId("match-aside");
      expect(lastValue(declarationsOf(aside, media.side), "width")).toBe("280px");
      expect(lastValue(declarationsOf(aside, media.landscapePhone), "width")).toBe("280px");
      expect(lastValue(declarationsOf(aside, media.tabletPortrait), "width")).toBe("280px");
      expect(lastValue(declarationsOf(aside, media.asideNarrow(MASTER_COLUMN_WIDTH)), "width")).toBe("200px");
    });

    it("counts the player's column for the narrow Histórico", () => {
      render(<MatchStageTemplate {...base} panel={<div />} aside={<div />} columnWidth={PLAYER_COLUMN_WIDTH} />);
      const aside = screen.getByTestId("match-aside");
      expect(lastValue(declarationsOf(aside, media.asideNarrow(PLAYER_COLUMN_WIDTH)), "width")).toBe("200px");
      expect(declarationsOf(aside, media.asideNarrow(MASTER_COLUMN_WIDTH))).toBe("");
    });

    it("narrows the Histórico by the queue column too in two columns, declared after", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} />);
      const at = `@media ${LANDSCAPE_TWO_COLUMN_QUERY} and ${asideNarrowQuery(QUEUE_COLUMN_WIDTH + MASTER_COLUMN_WIDTH)}`;
      expect(lastValue(declarationsOf(screen.getByTestId("match-aside"), at), "width")).toBe("200px");
    });

    it("lays fila and painel side by side on a low, wide landscape phone", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} sheet={<div />} sheetOpen />);
      const middle = screen.getByTestId("match-panel").parentElement!;
      const rules = declarationsOf(middle, media.landscapeTwoColumns);
      expect(rules).toContain('"rail queue panel stage aside"');
      expect(rules).toContain("grid-template-columns:72px 240px 320px");
      const queue = declarationsOf(screen.getByTestId("match-queue"), media.landscapeTwoColumns);
      expect(lastValue(queue, "width")).toBe("240px");
      expect(lastValue(queue, "display")).toBe("block");
      expect(lastValue(queue, "border-top")).toBe("none");
      // Com a ficha aberta o celular deitado esconde a fila; em duas colunas ela volta (declarada depois).
      expect(lastValue(declarationsOf(screen.getByTestId("match-queue"), media.landscapePhone), "display")).toBe("none");
    });

    it("keeps the player's grid out of the two-column rule", () => {
      render(<MatchStageTemplate {...base} panel={<div />} aside={<div />} columnWidth={PLAYER_COLUMN_WIDTH} />);
      const middle = screen.getByTestId("match-panel").parentElement!;
      expect(declarationsOf(middle, media.landscapeTwoColumns)).toBe("");
      expect(declarationsOf(middle, media.stackedWide)).toBe("");
    });

    it("puts the master's queue left of the bottom panel in the wide stack", () => {
      render(<MatchStageTemplate {...base} panel={<div />} queue={<div />} aside={<div />} panelHalf />);
      const middle = screen.getByTestId("match-panel").parentElement!;
      const rules = declarationsOf(middle, media.stackedWide);
      expect(rules).toContain('"stage stage aside" "queue panel panel" "rail rail rail"');
      expect(rules).toContain("grid-template-columns:320px minmax(0, 1fr) auto");
      expect(rules).toContain("minmax(0, 1fr) minmax(0, 1fr) 56px");
      const queue = declarationsOf(screen.getByTestId("match-queue"), media.stackedWide);
      expect(lastValue(queue, "display")).toBe("block");
      expect(lastValue(queue, "width")).toBe("320px");
    });

    it("docks the Histórico as a 280 px column without a shadow on a portrait tablet", () => {
      render(<MatchStageTemplate {...base} panel={<div />} aside={<div />} />);
      const rules = declarationsOf(screen.getByTestId("match-aside"), media.tabletPortrait);
      expect(lastValue(rules, "width")).toBe("280px");
      expect(lastValue(rules, "position")).toBe("static");
      expect(lastValue(rules, "grid-area")).toBe("aside");
      expect(lastValue(rules, "box-shadow")).toBe("none");
    });

    it("hides the Histórico scrim on a portrait tablet and with side columns", () => {
      render(<MatchStageTemplate {...base} aside={<div />} asideOpen onDismissAside={() => {}} />);
      const scrim = screen.getByTestId("aside-scrim");
      expect(lastValue(declarationsOf(scrim, media.tabletPortrait), "display")).toBe("none");
      expect(lastValue(declarationsOf(scrim, media.side), "display")).toBe("none");
    });

    it("keeps the portrait-phone Histórico a drawer of at most 280 px, with a shadow only there", () => {
      render(<MatchStageTemplate {...base} aside={<div />} />);
      const aside = screen.getByTestId("match-aside");
      expect(lastValue(declarationsOf(aside), "width")).toBe("min(86%, 280px)");
      expect(lastValue(declarationsOf(aside), "box-shadow")).not.toBe("none");
      expect(lastValue(declarationsOf(aside, media.side), "box-shadow")).toBe("none");
      expect(lastValue(declarationsOf(aside, media.landscapePhone), "box-shadow")).toBe("none");
    });
  });

  describe("the sheet in place of the column", () => {
    const base = {
      topbar: <div />,
      rail: <div />,
      stage: <div />,
      panel: <div />,
      queue: <div />,
      sheet: <div />,
      columnWidth: MASTER_COLUMN_WIDTH,
    };

    it("docks the open sheet in the left column below asideUp and on the landscape phone", () => {
      render(<MatchStageTemplate {...base} sheetOpen />);
      const sheet = screen.getByTestId("match-sheet-zone");
      for (const at of [media.sideBelowAsideUp, media.landscapePhone]) {
        const rules = declarationsOf(sheet, at);
        expect(lastValue(rules, "grid-column")).toBe("2");
        // O stylis compacta `1 / -1` ao emitir.
        expect(lastValue(rules, "grid-row")).toBe("1/-1");
        expect(lastValue(rules, "width")).toBe("340px");
        expect(lastValue(rules, "position")).toBe("relative");
        expect(lastValue(rules, "inset")).toBe("auto");
        expect(lastValue(rules, "border-radius")).toBe("0");
        expect(lastValue(rules, "box-shadow")).toBe("none");
        expect(lastValue(rules, "border-right")).toBe(`1px solid ${colors.surfaceInput}`);
        expect(lastValue(rules, "padding-bottom")).toBe("0");
      }
    });

    it("hides the panel and the queue while the docked sheet is open", () => {
      render(<MatchStageTemplate {...base} sheetOpen />);
      for (const zone of [screen.getByTestId("match-panel"), screen.getByTestId("match-queue")]) {
        expect(lastValue(declarationsOf(zone, media.sideBelowAsideUp), "display")).toBe("none");
        expect(lastValue(declarationsOf(zone, media.landscapePhone), "display")).toBe("none");
      }
    });

    it("keeps the panel and the queue while the sheet is closed", () => {
      render(<MatchStageTemplate {...base} />);
      expect(declarationsOf(screen.getByTestId("match-panel"), media.sideBelowAsideUp)).not.toContain("display:none");
      expect(lastValue(declarationsOf(screen.getByTestId("match-queue"), media.landscapePhone), "display")).toBe("block");
    });

    it("takes only the panel column (3) in two columns, keeping the queue", () => {
      render(<MatchStageTemplate {...base} sheetOpen />);
      const rules = declarationsOf(screen.getByTestId("match-sheet-zone"), media.landscapeTwoColumns);
      expect(lastValue(rules, "grid-column")).toBe("3");
      expect(lastValue(rules, "width")).toBe("340px");
    });

    it("keeps the sheet a sheet (with its close X) on a portrait tablet", () => {
      render(<MatchStageTemplate {...base} sheetOpen onDismissSheet={() => {}} />);
      expect(declarationsOf(screen.getByTestId("match-sheet-zone"), media.tabletPortrait)).toBe("");
      expect(declarationsOf(screen.getByTestId("match-panel"), media.tabletPortrait)).not.toContain("display:none");
      const closeX = screen.getByRole("button", { name: "Fechar a ficha" });
      expect(declarationsOf(closeX, media.tabletPortrait)).toBe("");
      expect(lastValue(declarationsOf(closeX, media.side), "display")).toBe("none");
    });

    it("keeps the sheet box beside the column from asideUp", () => {
      render(<MatchStageTemplate {...base} sheetOpen />);
      const rules = declarationsOf(screen.getByTestId("match-sheet-zone"), media.asideUp);
      expect(lastValue(rules, "grid-area")).toBe("stage");
      expect(lastValue(rules, "width")).toBe("clamp(340px, calc(100% - 300px), 420px)");
      expect(lastValue(rules, "box-shadow")).not.toBe("none");
      expect(lastValue(declarationsOf(screen.getByTestId("match-panel"), media.asideUp), "display")).toBeUndefined();
    });

    it("keeps the map tap that closes the docked sheet", () => {
      const onDismissSheet = vi.fn();
      render(<MatchStageTemplate {...base} sheetOpen onDismissSheet={onDismissSheet} />);
      fireEvent.click(screen.getByTestId("sheet-scrim"));
      expect(onDismissSheet).toHaveBeenCalledTimes(1);
    });
  });
});
