import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStageOverlays, playerPanelDismissible } from "../useStageOverlays";

const original = window.matchMedia;

function mockScreen({ width, height = 900, landscape = false }: { width: number; height?: number; landscape?: boolean }) {
  window.matchMedia = ((query: string) => {
    const minW = /min-width:\s*(\d+)px/.exec(query);
    const minH = /min-height:\s*(\d+)px/.exec(query);
    const maxH = /max-height:\s*(\d+)px/.exec(query);
    let matches: boolean;
    if (query.includes("orientation: landscape")) {
      matches = landscape && (!maxH || height <= Number(maxH[1]));
    } else if (minW) {
      matches = width >= Number(minW[1]);
    } else if (minH) {
      matches = height >= Number(minH[1]);
    } else {
      matches = false;
    }
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  }) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = original;
});

describe("useStageOverlays", () => {
  describe("tela estreita", () => {
    it("começa com o painel e a gaveta fechados", () => {
      const { result } = renderHook(() => useStageOverlays());
      expect(result.current.panelOpen).toBe(false);
      expect(result.current.asideOpen).toBe(false);
    });

    it("abrir a gaveta fecha o painel", () => {
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setAsideOpen(true));
      expect(result.current.asideOpen).toBe(true);
      expect(result.current.panelOpen).toBe(false);
    });

    it("abrir o painel fecha a gaveta", () => {
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setAsideOpen(true));
      act(() => result.current.setPanelOpen(true));
      expect(result.current.panelOpen).toBe(true);
      expect(result.current.asideOpen).toBe(false);
    });

    it("aceita updater", () => {
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setAsideOpen((o) => !o));
      expect(result.current.asideOpen).toBe(true);
      act(() => result.current.setAsideOpen((o) => !o));
      expect(result.current.asideOpen).toBe(false);
      expect(result.current.panelOpen).toBe(false);
    });

    it("fechar um não mexe no outro", () => {
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setPanelOpen(false));
      expect(result.current.asideOpen).toBe(false);
      act(() => result.current.setAsideOpen(true));
      act(() => result.current.setAsideOpen(false));
      expect(result.current.panelOpen).toBe(false);
    });

    it("closeAsideIfDrawer fecha a gaveta", () => {
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setAsideOpen(true));
      act(() => result.current.closeAsideIfDrawer());
      expect(result.current.asideOpen).toBe(false);
    });
  });

  describe("tela larga (>= asideUp)", () => {
    it("começa com painel e gaveta abertos", () => {
      mockScreen({ width: 1400 });
      const { result } = renderHook(() => useStageOverlays());
      expect(result.current.panelOpen).toBe(true);
      expect(result.current.asideOpen).toBe(true);
    });

    it("abrir um não fecha o outro", () => {
      mockScreen({ width: 1400 });
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setPanelOpen(false));
      act(() => result.current.setAsideOpen(true));
      expect(result.current.panelOpen).toBe(false);
      act(() => result.current.setPanelOpen(true));
      expect(result.current.asideOpen).toBe(true);
    });

    it("closeAsideIfDrawer não faz nada", () => {
      mockScreen({ width: 1400 });
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.closeAsideIfDrawer());
      expect(result.current.asideOpen).toBe(true);
    });
  });
});

describe("useStageOverlays layout rules", () => {
  it("keeps a fixed panel open and ignores setPanelOpen(false)", () => {
    const { result } = renderHook(() => useStageOverlays({ panelFixed: true }));
    expect(result.current.panelOpen).toBe(true);
    act(() => result.current.setPanelOpen(false));
    expect(result.current.panelOpen).toBe(true);
    act(() => result.current.setPanelOpen((o) => !o));
    expect(result.current.panelOpen).toBe(true);
  });

  it("opening the drawer does not close a fixed panel on a portrait phone", () => {
    const { result } = renderHook(() => useStageOverlays({ panelFixed: true }));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.asideOpen).toBe(true);
    expect(result.current.panelOpen).toBe(true);
  });

  it("lets the aside column and the panel stay open together from 768 px", () => {
    mockScreen({ width: 768 });
    const { result } = renderHook(() => useStageOverlays());
    act(() => result.current.setPanelOpen(true));
    act(() => result.current.setAsideOpen(true));
    expect(result.current.panelOpen).toBe(true);
    expect(result.current.asideOpen).toBe(true);
    act(() => result.current.setPanelOpen(false));
    act(() => result.current.setPanelOpen(true));
    expect(result.current.asideOpen).toBe(true);
  });

  it("opens the panel at start on a landscape phone and keeps the aside closed", () => {
    mockScreen({ width: 844, height: 390, landscape: true });
    const { result } = renderHook(() => useStageOverlays());
    expect(result.current.panelOpen).toBe(true);
    expect(result.current.asideOpen).toBe(false);
  });

  it("closeAsideIfDrawer leaves the aside column open on a tablet", () => {
    mockScreen({ width: 900 });
    const { result } = renderHook(() => useStageOverlays());
    act(() => result.current.setAsideOpen(true));
    act(() => result.current.closeAsideIfDrawer());
    expect(result.current.asideOpen).toBe(true);
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
