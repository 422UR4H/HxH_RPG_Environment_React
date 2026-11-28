import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStageOverlays, playerPanelDismissible } from "../useStageOverlays";
import { mockScreen } from "../../../../test/mockScreen";

// As regras de abertura não dependem do papel: um jogador (sem fila) basta.
const OPTS = { columnWidth: 340, queue: false };

const original = window.matchMedia;

afterEach(() => {
  window.matchMedia = original;
});

describe("useStageOverlays", () => {
  describe("tela estreita", () => {
    it("começa com o painel e a gaveta fechados", () => {
      const { result } = renderHook(() => useStageOverlays(OPTS));
      expect(result.current.panelOpen).toBe(false);
      expect(result.current.asideOpen).toBe(false);
    });

    it("abrir a gaveta fecha o painel", () => {
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.setAsideOpen(true));
      expect(result.current.asideOpen).toBe(true);
      expect(result.current.panelOpen).toBe(false);
    });

    it("abrir o painel fecha a gaveta", () => {
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.setAsideOpen(true));
      act(() => result.current.setPanelOpen(true));
      expect(result.current.panelOpen).toBe(true);
      expect(result.current.asideOpen).toBe(false);
    });

    it("aceita updater", () => {
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.setAsideOpen((o) => !o));
      expect(result.current.asideOpen).toBe(true);
      act(() => result.current.setAsideOpen((o) => !o));
      expect(result.current.asideOpen).toBe(false);
      expect(result.current.panelOpen).toBe(false);
    });

    it("fechar um não mexe no outro", () => {
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.setPanelOpen(false));
      expect(result.current.asideOpen).toBe(false);
      act(() => result.current.setAsideOpen(true));
      act(() => result.current.setAsideOpen(false));
      expect(result.current.panelOpen).toBe(false);
    });

    it("closeAsideIfDrawer fecha a gaveta", () => {
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.setAsideOpen(true));
      act(() => result.current.closeAsideIfDrawer());
      expect(result.current.asideOpen).toBe(false);
    });
  });

  describe("tela larga (>= asideUp)", () => {
    it("começa com painel e gaveta abertos", () => {
      mockScreen({ width: 1400, height: 900 });
      const { result } = renderHook(() => useStageOverlays(OPTS));
      expect(result.current.panelOpen).toBe(true);
      expect(result.current.asideOpen).toBe(true);
    });

    it("abrir um não fecha o outro", () => {
      mockScreen({ width: 1400, height: 900 });
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.setPanelOpen(false));
      act(() => result.current.setAsideOpen(true));
      expect(result.current.panelOpen).toBe(false);
      act(() => result.current.setPanelOpen(true));
      expect(result.current.asideOpen).toBe(true);
    });

    it("closeAsideIfDrawer não faz nada", () => {
      mockScreen({ width: 1400, height: 900 });
      const { result } = renderHook(() => useStageOverlays(OPTS));
      act(() => result.current.closeAsideIfDrawer());
      expect(result.current.asideOpen).toBe(true);
    });
  });
});

describe("useStageOverlays layout rules", () => {
  it("keeps a fixed panel open and ignores setPanelOpen(false)", () => {
    mockScreen({ width: 844, height: 390 }); // painel abre de início
    const { result, rerender } = renderHook((p: { fixed: boolean }) => useStageOverlays({ ...OPTS, panelFixed: p.fixed }), {
      initialProps: { fixed: true },
    });
    expect(result.current.panelOpen).toBe(true);
    act(() => result.current.setPanelOpen(false));
    // Solta o panelFixed para ler o estado de verdade: o setter não pode tê-lo fechado.
    rerender({ fixed: false });
    expect(result.current.panelOpen).toBe(true);
  });

  it("opening the drawer does not close a fixed panel on a portrait phone", () => {
    const { result, rerender } = renderHook((p: { fixed: boolean }) => useStageOverlays({ ...OPTS, panelFixed: p.fixed }), {
      initialProps: { fixed: false },
    });
    act(() => result.current.setPanelOpen(true));
    rerender({ fixed: true });
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideOpen).toBe(true);
    expect(result.current.panelOpen).toBe(true);
    rerender({ fixed: false });
    expect(result.current.panelOpen).toBe(true);
  });

  it("lets the aside column and the panel stay open together on a portrait tablet", () => {
    mockScreen({ width: 753, height: 1205 });
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setPanelOpen(true));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.panelOpen).toBe(true);
    expect(result.current.asideOpen).toBe(true);
    act(() => result.current.setPanelOpen(false));
    act(() => result.current.setPanelOpen(true));
    expect(result.current.asideOpen).toBe(true);
  });

  it("opens the panel at start on a landscape phone and keeps the aside closed", () => {
    mockScreen({ width: 844, height: 390 });
    const { result } = renderHook(() => useStageOverlays(OPTS));
    expect(result.current.panelOpen).toBe(true);
    expect(result.current.asideOpen).toBe(false);
  });

  it("closeAsideIfDrawer leaves the aside column open on a portrait tablet", () => {
    mockScreen({ width: 768, height: 1024 });
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.closeAsideIfDrawer());
    expect(result.current.asideOpen).toBe(true);
  });
});

describe("useStageOverlays on a stacked tablet", () => {
  it("starts with the panel closed on a portrait tablet, like the phone", () => {
    mockScreen({ width: 1024, height: 1366 });
    const { result } = renderHook(() => useStageOverlays(OPTS));
    expect(result.current.panelOpen).toBe(false);
    expect(result.current.asideOpen).toBe(false);
  });

  it("starts with the panel open on a landscape tablet (side columns)", () => {
    mockScreen({ width: 1024, height: 768 });
    const { result } = renderHook(() => useStageOverlays(OPTS));
    expect(result.current.panelOpen).toBe(true);
  });
});

describe("useStageOverlays sheet rule", () => {
  it("opening the sheet closes the aside on a portrait phone", () => {
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.setSheetOpen(true));
    expect(result.current.sheetOpen).toBe(true);
    expect(result.current.asideOpen).toBe(false);
  });

  it("opening the aside closes the sheet on a portrait phone", () => {
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setSheetOpen(true));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideOpen).toBe(true);
    expect(result.current.sheetOpen).toBe(false);
  });

  it("closing one never touches the other", () => {
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setSheetOpen(true));
    act(() => result.current.setSheetOpen(false));
    expect(result.current.asideOpen).toBe(false);
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.setAsideOpen(false));
    expect(result.current.sheetOpen).toBe(false);
  });

  it("accepts an updater for the sheet", () => {
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setSheetOpen((o) => !o));
    expect(result.current.sheetOpen).toBe(true);
  });

  it("does not couple the sheet and the aside column from 600 px in portrait", () => {
    mockScreen({ width: 753, height: 1205 });
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.setSheetOpen(true));
    expect(result.current.asideOpen).toBe(true);
    expect(result.current.sheetOpen).toBe(true);
    act(() => result.current.setAsideOpen(false));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.sheetOpen).toBe(true);
  });
});

describe("playerPanelDismissible", () => {
  it("Ação com personagem é o compositor: não", () => {
    expect(playerPanelDismissible({ railActive: "acao", hasActor: true, picking: false })).toBe(false);
  });
  it("Ficha: sim; Ficha escolhendo casa: não", () => {
    expect(playerPanelDismissible({ railActive: "ficha", hasActor: true, picking: false })).toBe(true);
    expect(playerPanelDismissible({ railActive: "ficha", hasActor: true, picking: true })).toBe(false);
  });
  it("sem personagem: sim", () => {
    expect(playerPanelDismissible({ railActive: "acao", hasActor: false, picking: false })).toBe(true);
  });
});

describe("useStageOverlays aside width modes", () => {
  const NARROW = { width: 907, height: 427 };
  const NOT_NARROW = { width: 1024, height: 768 };

  it("opens straight from closed as expanded on a narrow screen", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    expect(result.current.asideMode).toBe("closed");
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideMode).toBe("expanded");
    expect(result.current.asideOpen).toBe(true);
  });

  it("toggles closed -> expanded -> closed with the nav button updater", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen((o) => !o));
    expect(result.current.asideMode).toBe("expanded");
    act(() => result.current.setAsideOpen((o) => !o));
    expect(result.current.asideMode).toBe("closed");
  });

  it("the width button turns expanded into docked, and docked into expandedOverDocked", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("docked");
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("expandedOverDocked");
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("docked");
  });

  it("dismissing the expanded aside closes it, and over the docked one it goes back to docked", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.dismissExpandedAside());
    expect(result.current.asideMode).toBe("closed");
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.toggleAsideWidth());
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("expandedOverDocked");
    act(() => result.current.dismissExpandedAside());
    expect(result.current.asideMode).toBe("docked");
  });

  it("closeAsideIfDrawer also collapses the expanded modes, which sit over the map", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideMode).toBe("expanded");
    act(() => result.current.closeAsideIfDrawer());
    expect(result.current.asideMode).toBe("closed");
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.toggleAsideWidth());
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("expandedOverDocked");
    act(() => result.current.closeAsideIfDrawer());
    expect(result.current.asideMode).toBe("docked");
    act(() => result.current.closeAsideIfDrawer());
    expect(result.current.asideMode).toBe("docked");
  });

  it("dismissExpandedAside does nothing when docked", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.toggleAsideWidth());
    act(() => result.current.dismissExpandedAside());
    expect(result.current.asideMode).toBe("docked");
    act(() => result.current.dismissExpandedAside());
    expect(result.current.asideMode).toBe("docked");
  });

  it("the nav button closes the aside from any shown mode", () => {
    mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.toggleAsideWidth());
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("expandedOverDocked");
    act(() => result.current.setAsideOpen((o) => !o));
    expect(result.current.asideMode).toBe("closed");
    expect(result.current.asideOpen).toBe(false);
  });

  it("never expands where the aside is not narrow", () => {
    mockScreen(NOT_NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(false));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideMode).toBe("docked");
    act(() => result.current.toggleAsideWidth());
    expect(result.current.asideMode).toBe("docked");
  });

  it("reads expanded as docked when the screen stops being narrow (no invisible scrim left)", () => {
    const screen = mockScreen(NARROW);
    const { result } = renderHook(() => useStageOverlays(OPTS));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideMode).toBe("expanded");
    screen.resize(NOT_NARROW);
    expect(result.current.asideOpen).toBe(true);
    expect(result.current.asideMode).toBe("docked");
  });
});
