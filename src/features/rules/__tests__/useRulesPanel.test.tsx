import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { useRulesPanel } from "../useRulesPanel";

// O hook e uma sonda da navegação no mesmo roteador: a sonda mostra a URL e volta no histórico.
function setup(initialEntries: string[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({ panel: useRulesPanel(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
}

describe("useRulesPanel", () => {
  it("remembering the last chapter does not re-render the sheet", () => {
    let renders = 0;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/charactersheet/new?regras=atributos"]}>{children}</MemoryRouter>
    );
    const { result } = renderHook(
      () => {
        renders++;
        return useRulesPanel();
      },
      { wrapper },
    );
    const before = renders;
    const { setLastSlug } = result.current;

    act(() => result.current.setLastSlug("pericias"));
    act(() => result.current.setLastSlug("classes"));
    expect(renders).toBe(before);
    expect(result.current.getLastSlug()).toBe("classes");
    expect(result.current.setLastSlug).toBe(setLastSlug);
  });

  it("open pushes the param and back closes it", () => {
    const { result } = setup(["/home", "/charactersheet/new"]);
    expect(result.current.panel.openSlug).toBeNull();

    act(() => result.current.panel.open("atributos"));
    expect(result.current.panel.openSlug).toBe("atributos");
    expect(result.current.location.search).toBe("?regras=atributos");

    act(() => void result.current.navigate(-1));
    expect(result.current.panel.openSlug).toBeNull();
    expect(result.current.location.pathname).toBe("/charactersheet/new");
  });

  it("close after open goes back instead of leaving a dead entry", () => {
    const { result } = setup(["/home", "/charactersheet/new"]);
    act(() => result.current.panel.open("criacao"));
    act(() => result.current.panel.close());
    expect(result.current.panel.openSlug).toBeNull();
    expect(result.current.location.pathname).toBe("/charactersheet/new");

    // Sem entrada morta: um voltar a mais sai da ficha, como se o painel nunca tivesse aberto.
    act(() => void result.current.navigate(-1));
    expect(result.current.location.pathname).toBe("/home");
  });

  it("close on a deep link replaces the URL without the param", () => {
    const { result } = setup(["/home", "/charactersheet/new?regras=pericias"]);
    expect(result.current.panel.openSlug).toBe("pericias");

    act(() => result.current.panel.close());
    expect(result.current.panel.openSlug).toBeNull();
    expect(result.current.location.pathname).toBe("/charactersheet/new");
    expect(result.current.location.search).toBe("");

    act(() => void result.current.navigate(-1));
    expect(result.current.location.pathname).toBe("/home");
  });

  it("scrolling never rewrites the URL", () => {
    const { result } = setup(["/charactersheet/new"]);
    act(() => result.current.panel.open("atributos"));
    const before = result.current.location;

    act(() => result.current.panel.setLastSlug("pericias"));
    expect(result.current.panel.getLastSlug()).toBe("pericias");
    expect(result.current.location.search).toBe(before.search);
    expect(result.current.location.key).toBe(before.key);
    expect(result.current.panel.openSlug).toBe("atributos");
  });
});
