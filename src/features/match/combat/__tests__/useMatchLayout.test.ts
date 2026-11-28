import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMatchLayout, queueIsSplit, type MatchLayout } from "../useMatchLayout";
import { matchesMediaQuery, mockScreen, type TestScreen } from "../../../../test/mockScreen";
import { MASTER_COLUMN_WIDTH, PLAYER_COLUMN_WIDTH } from "../../../../components/templates/MatchStageTemplate.styles";
import {
  asideNarrowQuery,
  LANDSCAPE_PHONE_QUERY,
  LANDSCAPE_TWO_COLUMN_QUERY,
  QUEUE_COLUMN_WIDTH,
  STACKED_WIDE_QUERY,
  SIDE_BELOW_ASIDE_UP_QUERY,
  SIDE_LAYOUT_QUERY,
  TABLET_PORTRAIT_QUERY,
} from "../../../../styles/breakpoints";

const original = window.matchMedia;

afterEach(() => {
  window.matchMedia = original;
});

const MASTER = { columnWidth: MASTER_COLUMN_WIDTH, queue: true };
const PLAYER = { columnWidth: PLAYER_COLUMN_WIDTH, queue: false };

function layoutAt(s: TestScreen, options = MASTER): MatchLayout {
  mockScreen(s);
  return renderHook(() => useMatchLayout(options)).result.current;
}

describe("useMatchLayout", () => {
  it("treats the jsdom default as a portrait phone", () => {
    const { result } = renderHook(() => useMatchLayout(MASTER));
    expect(result.current).toEqual({
      stacked: true,
      landscape: false,
      landscapeSplit: false,
      wide: false,
      asideIsDrawer: true,
      sheetReplacesColumn: false,
      twoColumns: false,
      stackedWide: false,
      asideNarrow: false,
    });
  });

  it("stacks a portrait phone with the Histórico as a drawer", () => {
    expect(layoutAt({ width: 390, height: 844 })).toEqual({
      stacked: true,
      landscape: false,
      landscapeSplit: false,
      wide: false,
      asideIsDrawer: true,
      sheetReplacesColumn: false,
      twoColumns: false,
      stackedWide: false,
      asideNarrow: false,
    });
  });

  it("stacks a portrait tablet with the Histórico as a column", () => {
    const layout = layoutAt({ width: 753, height: 1205 });
    expect(layout.stacked).toBe(true);
    expect(layout.asideIsDrawer).toBe(false);
    expect(layout.sheetReplacesColumn).toBe(false);
    expect(queueIsSplit(layout)).toBe(false);
  });

  it("stacks every portrait screen up to 1279 px", () => {
    for (const s of [{ width: 600, height: 960 }, { width: 768, height: 1024 }, { width: 1024, height: 1366 }]) {
      const layout = layoutAt(s);
      expect(layout.stacked).toBe(true);
      expect(layout.asideIsDrawer).toBe(false);
    }
    expect(layoutAt({ width: 599, height: 960 }).asideIsDrawer).toBe(true);
  });

  it("uses side columns on a landscape tablet, with the split queue and the sheet in place of the column", () => {
    const layout = layoutAt({ width: 1024, height: 768 });
    expect(layout.stacked).toBe(false);
    expect(layout.landscape).toBe(false);
    expect(layout.asideIsDrawer).toBe(false);
    expect(queueIsSplit(layout)).toBe(true);
    expect(layout.sheetReplacesColumn).toBe(true);
  });

  it("uses side columns from 1280 px without the sheet in place of the column", () => {
    const layout = layoutAt({ width: 1400, height: 900 });
    expect(layout.stacked).toBe(false);
    expect(queueIsSplit(layout)).toBe(true);
    expect(layout.sheetReplacesColumn).toBe(false);
  });

  it("uses side columns on a low desktop window below 1024 px", () => {
    const layout = layoutAt({ width: 900, height: 700 });
    expect(layout.stacked).toBe(false);
    expect(layout.landscape).toBe(false);
    expect(layout.sheetReplacesColumn).toBe(true);
  });

  it("reports a landscape phone tall enough to split", () => {
    expect(layoutAt({ width: 844, height: 427 })).toEqual({
      stacked: false,
      landscape: true,
      landscapeSplit: true,
      wide: false,
      asideIsDrawer: false,
      sheetReplacesColumn: true,
      twoColumns: false,
      stackedWide: false,
      asideNarrow: true,
    });
  });

  it("reports a short landscape phone that cannot split", () => {
    const layout = layoutAt({ width: 907, height: 303 });
    expect(layout.landscape).toBe(true);
    expect(layout.landscapeSplit).toBe(false);
    expect(queueIsSplit(layout)).toBe(false);
    expect(layout.sheetReplacesColumn).toBe(true);
  });

  it("reports widescreen from 1600 px", () => {
    expect(layoutAt({ width: 1600, height: 900 }).wide).toBe(true);
  });

  it("never reports widescreen in landscape-phone mode, and keeps the sheet in place of the column there", () => {
    const layout = layoutAt({ width: 1700, height: 500 });
    expect(layout.wide).toBe(false);
    expect(layout.landscape).toBe(true);
    expect(layout.sheetReplacesColumn).toBe(true);
  });
});

describe("space-based rules", () => {
  it("narrows the Histórico on the owner's phone in the browser (907×303) and does not split", () => {
    const layout = layoutAt({ width: 907, height: 303 });
    expect(layout.landscape).toBe(true);
    expect(layout.landscapeSplit).toBe(false);
    expect(layout.twoColumns).toBe(false);
    expect(layout.asideNarrow).toBe(true);
  });

  it("splits the owner's phone in fullscreen (907×427), with the narrow Histórico", () => {
    const layout = layoutAt({ width: 907, height: 427 });
    expect(layout.landscapeSplit).toBe(true);
    expect(layout.asideNarrow).toBe(true);
  });

  it("splits from 400 px of height, not 399", () => {
    expect(layoutAt({ width: 844, height: 399 }).landscapeSplit).toBe(false);
    expect(layoutAt({ width: 844, height: 400 }).landscapeSplit).toBe(true);
  });

  it("uses two columns on a low, wide landscape phone and narrows the Histórico by the 560 px on the left", () => {
    const narrow = layoutAt({ width: 1200, height: 380 });
    expect(narrow.twoColumns).toBe(true);
    expect(narrow.asideNarrow).toBe(true);
    expect(queueIsSplit(narrow)).toBe(true);
    const wide = layoutAt({ width: 1240, height: 380 });
    expect(wide.twoColumns).toBe(true);
    expect(wide.asideNarrow).toBe(false);
  });

  it("does not use two columns below 1152 px", () => {
    const layout = layoutAt({ width: 1100, height: 380 });
    expect(layout.twoColumns).toBe(false);
    expect(layout.asideNarrow).toBe(false);
    expect(layoutAt({ width: 1151, height: 380 }).twoColumns).toBe(false);
    expect(layoutAt({ width: 1152, height: 380 }).twoColumns).toBe(true);
  });

  it("never uses two columns for the player (no queue)", () => {
    expect(layoutAt({ width: 1200, height: 380 }, PLAYER).twoColumns).toBe(false);
  });

  it("keeps 280 when 320 px of map is left and narrows to 200 below that (master)", () => {
    expect(layoutAt({ width: 1024, height: 768 }).asideNarrow).toBe(false);
    expect(layoutAt({ width: 991, height: 700 }).asideNarrow).toBe(true);
    expect(layoutAt({ width: 992, height: 700 }).asideNarrow).toBe(false);
  });

  it("counts the player's 340 px column", () => {
    expect(layoutAt({ width: 1000, height: 700 }, PLAYER).asideNarrow).toBe(true);
    expect(layoutAt({ width: 1012, height: 700 }, PLAYER).asideNarrow).toBe(false);
  });

  it("leaves a portrait tablet with the wide Histórico and no wide stack", () => {
    const layout = layoutAt({ width: 753, height: 1205 });
    expect(layout.stacked).toBe(true);
    expect(layout.stackedWide).toBe(false);
    expect(layout.asideNarrow).toBe(false);
    expect(layout.asideIsDrawer).toBe(false);
  });

  it("puts the master's queue beside the bottom panel on a portrait monitor", () => {
    const layout = layoutAt({ width: 1080, height: 1920 });
    expect(layout.stacked).toBe(true);
    expect(layout.stackedWide).toBe(true);
    expect(queueIsSplit(layout)).toBe(true);
    expect(layoutAt({ width: 1080, height: 1920 }, PLAYER).stackedWide).toBe(false);
    expect(layoutAt({ width: 899, height: 1400 }).stackedWide).toBe(false);
  });

  it.each([
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ])("keeps desktops wide and in one piece at $width×$height", (s) => {
    const layout = layoutAt(s);
    expect(layout.asideNarrow).toBe(false);
    expect(layout.twoColumns).toBe(false);
  });
});

describe("queueIsSplit", () => {
  const layout = (over: Partial<MatchLayout>): MatchLayout => ({
    stacked: false,
    landscape: false,
    landscapeSplit: false,
    wide: false,
    asideIsDrawer: false,
    sheetReplacesColumn: false,
    twoColumns: false,
    stackedWide: false,
    asideNarrow: false,
    ...over,
  });

  it("is false when stacked", () => {
    expect(queueIsSplit(layout({ stacked: true, asideIsDrawer: true }))).toBe(false);
    expect(queueIsSplit(layout({ stacked: true }))).toBe(false);
  });

  it("is false on a short landscape phone", () => {
    expect(queueIsSplit(layout({ landscape: true }))).toBe(false);
  });

  it("is true on a tall landscape phone", () => {
    expect(queueIsSplit(layout({ landscape: true, landscapeSplit: true }))).toBe(true);
  });

  it("is true in two columns and in the wide stack", () => {
    expect(queueIsSplit(layout({ landscape: true, twoColumns: true }))).toBe(true);
    expect(queueIsSplit(layout({ stacked: true, stackedWide: true }))).toBe(true);
  });

  it("is true with side columns on tablet, desktop and widescreen", () => {
    expect(queueIsSplit(layout({}))).toBe(true);
    expect(queueIsSplit(layout({ wide: true }))).toBe(true);
  });
});

// O template decide pelo CSS (estas queries) e as páginas pelo hook: os dois têm de concordar em
// toda tela, inclusive com largura fracionária (1279.5).
describe("the template's CSS queries agree with the hook", () => {
  const screens: TestScreen[] = [
    { width: 390, height: 844 },
    { width: 600, height: 960 },
    { width: 753, height: 1205 },
    { width: 1024, height: 1366 },
    { width: 1279.5, height: 900 },
    { width: 844, height: 390 },
    { width: 907, height: 303 },
    { width: 1024, height: 768 },
    { width: 1279, height: 800 },
    { width: 1280, height: 800 },
    { width: 1400, height: 900 },
    { width: 1920, height: 1080 },
    { width: 907, height: 427 },
    { width: 844, height: 399 },
    { width: 844, height: 400 },
    { width: 1100, height: 380 },
    { width: 1151.5, height: 380 },
    { width: 1200, height: 380 },
    { width: 1240, height: 380 },
    { width: 991.5, height: 700 },
    { width: 992, height: 700 },
    { width: 899, height: 1400 },
    { width: 900, height: 1400 },
    { width: 1080, height: 1920 },
    { width: 1279.5, height: 1700 },
  ];

  it.each(screens)("agrees at $width×$height", (s) => {
    const layout = layoutAt(s);
    const matchesAt = (query: string) => matchesMediaQuery(query, s);
    expect(matchesAt(LANDSCAPE_TWO_COLUMN_QUERY)).toBe(layout.twoColumns);
    // O template declara 200 em `asideNarrow(320)` e, em duas colunas, em `asideNarrow(560)`.
    const narrowQuery = asideNarrowQuery(layout.twoColumns ? QUEUE_COLUMN_WIDTH + MASTER_COLUMN_WIDTH : MASTER_COLUMN_WIDTH);
    expect(matchesAt(narrowQuery)).toBe(layout.asideNarrow);
    expect(matchesAt(STACKED_WIDE_QUERY)).toBe(layout.stackedWide);
    expect(matchesAt(LANDSCAPE_PHONE_QUERY) && s.height >= 400).toBe(layout.landscapeSplit);
    const matches = (query: string) => matchesMediaQuery(query, s);
    const side = matches(SIDE_LAYOUT_QUERY);
    const tabletPortrait = matches(TABLET_PORTRAIT_QUERY);
    expect(matches(SIDE_BELOW_ASIDE_UP_QUERY) || matches(LANDSCAPE_PHONE_QUERY)).toBe(layout.sheetReplacesColumn);
    expect(!side && !tabletPortrait).toBe(layout.asideIsDrawer);
    expect(side).toBe(!layout.stacked);
  });
});
