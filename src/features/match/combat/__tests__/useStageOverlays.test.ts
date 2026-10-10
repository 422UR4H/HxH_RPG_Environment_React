import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStageOverlays } from "../useStageOverlays";

const original = window.matchMedia;

// O setup devolve sempre `matches: false` (tela estreita); para tela larga responde por query.
function setWidth(px: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    return {
      matches: min ? px >= Number(min[1]) : false,
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
    it("começa com o painel aberto e a gaveta fechada", () => {
      const { result } = renderHook(() => useStageOverlays());
      expect(result.current.panelOpen).toBe(true);
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
      setWidth(1400);
      const { result } = renderHook(() => useStageOverlays());
      expect(result.current.panelOpen).toBe(true);
      expect(result.current.asideOpen).toBe(true);
    });

    it("abrir um não fecha o outro", () => {
      setWidth(1400);
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.setPanelOpen(false));
      act(() => result.current.setAsideOpen(true));
      expect(result.current.panelOpen).toBe(false);
      act(() => result.current.setPanelOpen(true));
      expect(result.current.asideOpen).toBe(true);
    });

    it("closeAsideIfDrawer não faz nada", () => {
      setWidth(1400);
      const { result } = renderHook(() => useStageOverlays());
      act(() => result.current.closeAsideIfDrawer());
      expect(result.current.asideOpen).toBe(true);
    });
  });
});
