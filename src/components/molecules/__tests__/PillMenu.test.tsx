import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockReducedMotion } from "../../../test/reducedMotion";
import PillMenu, { type PillMenuItem } from "../PillMenu";
import { capRadius } from "../useAttachedList";

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

// jsdom não tem layout: a pílula ganha um retângulo e a lista, uma largura natural de conteúdo
// (lida enquanto ela está com `width: max-content`).
describe("PillMenu — width", () => {
  const realInnerWidth = window.innerWidth;
  let pill = { left: 0, width: 0 };
  let contentWidth = 0;
  const spies: { mockRestore: () => void }[] = [];

  beforeEach(() => {
    restoreMotion = mockReducedMotion(true);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    spies.push(
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
        if (this instanceof HTMLElement && this.style.width === "max-content") {
          return { top: 0, bottom: 0, left: 0, right: contentWidth, width: contentWidth, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        const r = { top: 700, bottom: 744, left: pill.left, right: pill.left + pill.width, width: pill.width, height: 44 };
        return { ...r, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
      }),
    );
  });

  afterEach(() => {
    spies.splice(0).forEach((s) => s.mockRestore());
    Object.defineProperty(window, "innerWidth", { configurable: true, value: realInnerWidth });
  });

  const list = () => screen.getByRole("menu");

  it("keeps the pill's width when the items fit", async () => {
    pill = { left: 40, width: 208 };
    contentWidth = 160;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--list-width")).toBe("208px");
    expect(list().style.getPropertyValue("--overhang-radius")).toBe("0px");
  });

  it("grows to the right to fit the items when the pill is narrower", async () => {
    pill = { left: 40, width: 119 };
    contentWidth = 170;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--list-width")).toBe("170px");
    expect(list().style.getPropertyValue("--joint-width")).toBe("119px");
    expect(list().style.getPropertyValue("--fallback-right")).toBe(`${390 - 159}px`);
    expect(list()).toHaveAttribute("data-align", "start");
  });

  it("rounds a fractional content width up, so a word never wraps by a sub-pixel", async () => {
    pill = { left: 40, width: 119 };
    contentWidth = 169.3;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--list-width")).toBe("170px");
  });

  it("grows to the left when growing right would leave the window", async () => {
    pill = { left: 255, width: 119 };
    contentWidth = 170;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--list-width")).toBe("170px");
    expect(list().style.getPropertyValue("--fallback-right")).toBe(`${390 - 374}px`);
    expect(list()).toHaveAttribute("data-align", "end");
  });

  it("never grows past the window", async () => {
    pill = { left: 40, width: 119 };
    contentWidth = 500;
    setup({ blocked: true });
    await userEvent.click(trigger());
    expect(list().style.getPropertyValue("--list-width")).toBe(`${390 - 16}px`);
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
