import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockReducedMotion } from "../../../test/reducedMotion";
import PillMenu, { type PillMenuItem } from "../PillMenu";
import { capRadius, ROW_FONT_VAR } from "../useAttachedList";

let restoreMotion: () => void = () => {};

afterEach(() => {
  restoreMotion();
});

const REASON = "Ficha em campanha não pode ser excluída.";

function setup({ blocked = false } = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const items: PillMenuItem[] = [
    { key: "edit", content: "Editar", onSelect: onEdit },
    { key: "copy", content: "Copiar", onSelect: vi.fn() },
    { key: "delete", content: "Excluir", onSelect: onDelete, blockedReason: blocked ? REASON : undefined },
  ];
  render(
    <>
      <button>antes</button>
      <PillMenu items={items} label={(open) => `Gerenciar ${open ? "▴" : "▾"}`} />
      <button>depois</button>
    </>,
  );
  return { onEdit, onDelete };
}

const trigger = () => screen.getByRole("button", { name: /Gerenciar/ });
const menu = () => screen.queryByRole("menu");
const item = (name: RegExp) => screen.getByRole("menuitem", { name });

describe("PillMenu", () => {
  it("exposes the menu button ARIA contract, closed and open", async () => {
    restoreMotion = mockReducedMotion(true);
    setup();
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(menu()).toBeNull();

    await userEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveTextContent("Gerenciar ▴");
    const list = menu();
    expect(list).toHaveAccessibleName(/Gerenciar/);
    expect(trigger()).toHaveAttribute("aria-controls", list?.id);
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(["Editar", "Copiar", "Excluir"]);
  });

  it("toggles with a click on the trigger", async () => {
    restoreMotion = mockReducedMotion(true);
    setup();
    await userEvent.click(trigger());
    expect(menu()).not.toBeNull();
    await userEvent.click(trigger());
    expect(menu()).toBeNull();
  });

  it("runs the item action and closes on click", async () => {
    restoreMotion = mockReducedMotion(true);
    const { onEdit } = setup();
    await userEvent.click(trigger());
    await userEvent.click(item(/Editar/));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it("opens on the first item with Enter, Space and ArrowDown, and on the last with ArrowUp", async () => {
    restoreMotion = mockReducedMotion(true);
    setup();
    for (const key of ["{Enter}", " ", "{ArrowDown}"]) {
      trigger().focus();
      await userEvent.keyboard(key);
      expect(item(/Editar/)).toHaveFocus();
      await userEvent.keyboard("{Escape}");
    }
    trigger().focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(item(/Excluir/)).toHaveFocus();
  });

  it("moves focus with arrows (wrapping), Home and End", async () => {
    restoreMotion = mockReducedMotion(true);
    setup();
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}");
    expect(item(/Copiar/)).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(item(/Editar/)).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(item(/Excluir/)).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(item(/Editar/)).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(item(/Excluir/)).toHaveFocus();
  });

  it("runs the focused item with Enter", async () => {
    restoreMotion = mockReducedMotion(true);
    const { onEdit } = setup();
    trigger().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes with Escape, returns focus to the trigger and keeps Escape from outer listeners", async () => {
    restoreMotion = mockReducedMotion(true);
    setup();
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    outer.mockClear();
    await userEvent.keyboard("{Escape}");
    document.removeEventListener("keydown", outer);
    expect(menu()).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(outer).not.toHaveBeenCalled();
  });

  // O navegador segue o Tab a partir do foco no fim do keydown (a pílula); o user-event parte do
  // alvo original, então aqui se confere o que o componente faz: foco na pílula, sem preventDefault.
  it("closes with Tab, moving focus back to the trigger without blocking the Tab", async () => {
    restoreMotion = mockReducedMotion(true);
    setup();
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => {
      item(/Editar/).dispatchEvent(tab);
    });
    expect(tab.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on an outside click without running anything", async () => {
    restoreMotion = mockReducedMotion(true);
    const { onEdit, onDelete } = setup();
    await userEvent.click(trigger());
    await userEvent.click(document.body);
    expect(menu()).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps a blocked item focusable with its reason, and clicking it neither runs nor closes", async () => {
    restoreMotion = mockReducedMotion(true);
    const { onDelete } = setup({ blocked: true });
    trigger().focus();
    await userEvent.keyboard("{ArrowUp}");
    const blocked = item(/Excluir/);
    expect(blocked).toHaveFocus();
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAccessibleDescription(REASON);
    await userEvent.keyboard("{Enter}");
    await userEvent.click(blocked);
    expect(onDelete).not.toHaveBeenCalled();
    expect(menu()).not.toBeNull();
  });

  it("keeps the menu mounted but out of reach while rolling up, then unmounts", async () => {
    restoreMotion = mockReducedMotion(false);
    setup();
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    expect(menu()).toBeNull();
    expect(trigger()).toHaveAttribute("data-state", "closing");
    expect(document.querySelector('[role="menu"]')).toHaveAttribute("inert");
  });
});

// jsdom não tem layout: a pílula ganha um retângulo e um estilo calculado, e a lista, uma largura
// natural de conteúdo (lida enquanto ela está com `width: max-content`) proporcional à fonte das linhas.
describe("PillMenu — width and row font", () => {
  const realInnerWidth = window.innerWidth;
  let pill = { left: 0, width: 0 };
  // A pílula "apertada": o retângulo encolhe 2% em torno do centro enquanto a transformação vale.
  let pressed = false;
  let pillStyle: Record<string, string> = {};
  // Largura do conteúdo (sem bordas nem recuo) com a fonte `f` das linhas.
  let contentAt: (f: number) => number = () => 0;
  const spies: { mockRestore: () => void }[] = [];

  const chrome = () =>
    2 * parseFloat(pillStyle.borderTopWidth) + parseFloat(pillStyle.paddingLeft) + parseFloat(pillStyle.paddingRight);

  beforeEach(() => {
    restoreMotion = mockReducedMotion(true);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    pressed = false;
    pillStyle = { fontSize: "13px", paddingLeft: "12px", paddingRight: "12px", borderTopWidth: "1px" };
    const realComputed = window.getComputedStyle.bind(window);
    spies.push(
      vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
        const real = realComputed(el, pseudo);
        if (el.getAttribute("aria-haspopup") !== "menu") return real;
        return new Proxy(real, {
          get: (t, k: string) => (k in pillStyle ? pillStyle[k] : Reflect.get(t, k).bind?.(t) ?? Reflect.get(t, k)),
        });
      }),
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        if (this instanceof HTMLElement && this.style.width === "max-content") {
          const width = chrome() + contentAt(parseFloat(this.style.getPropertyValue(ROW_FONT_VAR)));
          return { top: 0, bottom: 0, left: 0, right: width, width, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        let r = { top: 700, bottom: 744, left: pill.left, right: pill.left + pill.width, width: pill.width, height: 44 };
        if (pressed && this instanceof HTMLElement && this.style.transform !== "none") {
          const dx = pill.width * 0.01;
          const dy = 44 * 0.01;
          r = { top: 700 + dy, bottom: 744 - dy, left: pill.left + dx, right: pill.left + pill.width - dx, width: pill.width * 0.98, height: 44 * 0.98 };
        }
        return { ...r, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
      }),
    );
  });

  afterEach(() => {
    spies.splice(0).forEach((s) => s.mockRestore());
    Object.defineProperty(window, "innerWidth", { configurable: true, value: realInnerWidth });
  });

  const list = () => screen.getByRole("menu");
  const rowFont = () => list().style.getPropertyValue(ROW_FONT_VAR);

  it("keeps the list exactly as wide as the pill, never growing to its content", async () => {
    pill = { left: 40, width: 119 };
    contentAt = (f) => 30 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--fallback-width")).toBe("119px");
    expect(list().style.getPropertyValue("--list-width")).toBe("");
    expect(list()).not.toHaveAttribute("data-align");
  });

  it("keeps the pill's font when the widest row fits", async () => {
    pill = { left: 40, width: 208 };
    contentAt = (f) => 7 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("13px");
  });

  it("caps the row font at 17px on a larger pill", async () => {
    pillStyle.fontSize = "22px";
    pill = { left: 40, width: 300 };
    contentAt = (f) => 7 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("17px");
  });

  it("shrinks the row font, rounded down to 0.25px, until the widest row fits a narrow pill", async () => {
    // Largura útil: 119 − 2 − 24 = 93 px; a 13 px o conteúdo tem 104 → 13 × 93/104 = 11.625 → 11.5.
    pill = { left: 40, width: 119 };
    contentAt = (f) => 8 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("11.5px");
    expect(8 * parseFloat(rowFont())).toBeLessThanOrEqual(93);
  });

  it("steps further down when the text does not scale exactly with the font", async () => {
    // Abaixo da referência sobra 1,5 px (hinting): a conta dá 11.5 (93,5 px), o passo seguinte cabe.
    pill = { left: 40, width: 119 };
    contentAt = (f) => 8 * f + (f < 13 ? 1.5 : 0);
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("11.25px");
  });

  it("places and fits the list on the pill's untransformed box, not its pressed (scaled) rectangle", async () => {
    // No `:active` (preso no iOS) a pílula está com scale(0.98): o retângulo só é o de verdade sem a
    // transformação. Sem anchor positioning, a geometria do JS é a que vale.
    pressed = true;
    pill = { left: 40, width: 119 };
    contentAt = (f) => 8 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--fallback-left")).toBe("40px");
    expect(list().style.getPropertyValue("--fallback-width")).toBe("119px");
    expect(list().style.getPropertyValue("--fallback-top")).toBe("743px");
    expect(rowFont()).toBe("11.5px");
    // A transformação inline de antes volta.
    expect(trigger().style.transform).toBe("");
    expect(trigger().style.transition).toBe("");
  });

  it("refits the row font when an image that was still loading arrives", async () => {
    // Na 1ª abertura o "?" ainda não carregou: sem largura, a linha mede só 8 px por px de fonte
    // (cabe a 13 px); carregado, ganha 2 px por px de fonte e a fonte tem de cair.
    let loaded = false;
    const complete = vi
      .spyOn(HTMLImageElement.prototype, "complete", "get")
      .mockImplementation(() => loaded);
    spies.push(complete);
    pill = { left: 40, width: 135 };
    contentAt = (f) => (loaded ? 10 : 8) * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("13px");

    const mark = list().querySelector("[data-help-mark]");
    expect(mark).not.toBeNull();
    loaded = true;
    act(() => {
      mark?.dispatchEvent(new Event("load"));
    });
    // Largura útil: 135 − 2 − 24 = 109 → 13 × 109/130 = 10.9 → 10.75.
    expect(rowFont()).toBe("10.75px");
    expect(list().style.getPropertyValue("--fallback-width")).toBe("135px");
  });

  it("never goes below the 10px floor", async () => {
    pill = { left: 40, width: 60 };
    contentAt = (f) => 8 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("10px");
  });

  it("keeps width and row font while scrolling, and refits on resize", async () => {
    pill = { left: 40, width: 119 };
    contentAt = (f) => 8 * f;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(rowFont()).toBe("11.5px");

    // A medida mudaria (ex.: fonte trocada), mas rolar não recalcula.
    contentAt = (f) => 6 * f;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(rowFont()).toBe("11.5px");
    expect(list().style.getPropertyValue("--fallback-width")).toBe("119px");

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(rowFont()).toBe("13px");
    expect(list().style.getPropertyValue("--fallback-width")).toBe("119px");
  });
});

describe("PillMenu — open radius", () => {
  // A pílula fechada tem o raio `closed` nos dois lados (jsdom não calcula o estilo do consumidor).
  function mockTriggerRadius(closed: string) {
    const realComputed = window.getComputedStyle.bind(window);
    const fake: Record<string, string> = { borderTopLeftRadius: closed, borderBottomLeftRadius: closed };
    return vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
      const real = realComputed(el, pseudo);
      if (el.getAttribute("aria-haspopup") !== "menu") return real;
      return new Proxy(real, {
        get: (t, k: string) => (k in fake ? fake[k] : Reflect.get(t, k).bind?.(t) ?? Reflect.get(t, k)),
      });
    });
  }

  it("computes the open radius as min(closed, 16px)", () => {
    expect(capRadius("50px", 16)).toBe("16px");
    expect(capRadius("8px", 16)).toBe("8px");
    expect(capRadius("16px", 16)).toBe("16px");
  });

  it.each([
    ["50px", "16px"],
    ["8px", "8px"],
  ])("opens a %s pill with %s outer corners on the pill and the list", async (closed, open) => {
    restoreMotion = mockReducedMotion(true);
    const spy = mockTriggerRadius(closed);
    setup();
    try {
      await userEvent.click(trigger());
    } finally {
      spy.mockRestore();
    }
    expect(trigger()).toHaveAttribute("data-state", "open");
    expect(trigger().style.getPropertyValue("--attached-open-radius")).toBe(open);
    expect(menu()?.style.getPropertyValue("--pill-radius")).toBe(open);
  });
});
