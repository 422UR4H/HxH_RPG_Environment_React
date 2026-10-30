import { useState } from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockReducedMotion } from "../../../test/reducedMotion";
import PillSelect, { type PillSelectOption } from "../PillSelect";

let restoreMotion: () => void = () => {};

// jsdom não tem layout: a pílula ocupa um retângulo fixo dentro da janela (768 de altura).
let pillRect = { top: 100, bottom: 157, left: 50, right: 393, width: 343, height: 57 };
const rectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect");

beforeEach(() => {
  pillRect = { top: 100, bottom: 157, left: 50, right: 393, width: 343, height: 57 };
  rectSpy.mockImplementation(function () {
    return { ...pillRect, x: pillRect.left, y: pillRect.top, toJSON: () => ({}) } as DOMRect;
  });
});

afterEach(() => {
  restoreMotion();
  vi.useRealTimers();
  heightSpy?.mockRestore();
  heightSpy = undefined;
});

const OPTIONS: PillSelectOption[] = [
  { value: "", label: "Selecione" },
  { value: "a", label: "Alquimista" },
  { value: "b", label: "Bruxo", disabled: true },
  { value: "c", label: "Caçador" },
  { value: "d", label: "Curandeiro" },
];

function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <button>antes</button>
      <PillSelect
        aria-label="Classe"
        value={value}
        options={OPTIONS}
        onChange={(v) => {
          setValue(v);
          onChange?.(v);
        }}
      />
      <button>depois</button>
    </>
  );
}

// A lista tem 5 × 44 px de conteúdo; jsdom não mede, então `scrollHeight` é simulado.
let heightSpy: { mockRestore: () => void } | undefined;
function mockListHeight(height: number) {
  heightSpy = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(height);
}

const trigger = () => screen.getByRole("combobox", { name: "Classe" });
const listbox = () => screen.queryByRole("listbox");

function activeOptionName() {
  const id = trigger().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent : undefined;
}

describe("PillSelect", () => {
  it("exposes the combobox ARIA contract, closed and open", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");
    expect(listbox()).toBeNull();

    await userEvent.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const list = screen.getByRole("listbox", { name: "Classe" });
    expect(trigger()).toHaveAttribute("aria-controls", list.id);
    expect(screen.getAllByRole("option")).toHaveLength(OPTIONS.length);
    expect(screen.getByRole("option", { name: "Selecione" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Bruxo" })).toHaveAttribute("aria-disabled", "true");
    // O foco fica no gatilho; a opção ativa é apontada por aria-activedescendant.
    expect(trigger()).toHaveFocus();
    expect(activeOptionName()).toContain("Selecione");
  });

  it("shows the selected label and sizes the closed pill by the longest label", () => {
    const { container } = render(<Harness />);
    expect(trigger()).toHaveTextContent("Selecione");
    const sizers = container.querySelectorAll("[data-label]");
    expect(Array.from(sizers).map((s) => s.getAttribute("data-label"))).toEqual(
      OPTIONS.map((o) => o.label),
    );
    expect(Array.from(sizers).every((s) => s.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it.each(["{ArrowDown}", "{ArrowUp}", "{Enter}", " ", "{Alt>}{ArrowDown}{/Alt}"])(
    "opens with %s when closed",
    async (keys) => {
      restoreMotion = mockReducedMotion(true);
      render(<Harness />);
      trigger().focus();
      await userEvent.keyboard(keys);
      expect(listbox()).not.toBeNull();
    },
  );

  it("opens on the first or last enabled option with Home and End", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("{End}");
    expect(activeOptionName()).toContain("Curandeiro");
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Home}");
    expect(activeOptionName()).toContain("Selecione");
  });

  it("moves with arrows, skipping disabled options, and stops at the ends", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}"); // abre em Selecione
    await userEvent.keyboard("{ArrowDown}");
    expect(activeOptionName()).toContain("Alquimista");
    await userEvent.keyboard("{ArrowDown}"); // pula Bruxo
    expect(activeOptionName()).toContain("Caçador");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(activeOptionName()).toContain("Curandeiro");
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(activeOptionName()).toContain("Selecione");
  });

  it("moves with Home, End, PageUp and PageDown while open", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}{End}");
    expect(activeOptionName()).toContain("Curandeiro");
    await userEvent.keyboard("{Home}");
    expect(activeOptionName()).toContain("Selecione");
    await userEvent.keyboard("{PageDown}");
    expect(activeOptionName()).toContain("Curandeiro");
    await userEvent.keyboard("{PageUp}");
    expect(activeOptionName()).toContain("Selecione");
  });

  it.each(["{Enter}", " ", "{Alt>}{ArrowUp}{/Alt}"])(
    "chooses the active option and closes with %s",
    async (key) => {
      restoreMotion = mockReducedMotion(true);
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      trigger().focus();
      await userEvent.keyboard("{ArrowDown}{ArrowDown}");
      await userEvent.keyboard(key);
      expect(onChange).toHaveBeenCalledExactlyOnceWith("a");
      expect(listbox()).toBeNull();
      expect(trigger()).toHaveTextContent("Alquimista");
      expect(trigger()).toHaveFocus();
    },
  );

  it("closes with Escape without changing", async () => {
    restoreMotion = mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Escape}");
    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it("does not let Escape reach outer listeners while open", async () => {
    restoreMotion = mockReducedMotion(true);
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}");
    outer.mockClear();
    await userEvent.keyboard("{Escape}");
    document.removeEventListener("keydown", outer);
    expect(outer).not.toHaveBeenCalled();
  });

  it("Tab chooses the active option, closes and lets focus move on", async () => {
    restoreMotion = mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledExactlyOnceWith("a");
    expect(listbox()).toBeNull();
    expect(screen.getByText("depois")).toHaveFocus();
  });

  it("jumps by typing, from closed and from open, and cycles repeated letters", async () => {
    restoreMotion = mockReducedMotion(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);
    trigger().focus();
    await user.keyboard("c"); // abre em Caçador
    expect(listbox()).not.toBeNull();
    expect(activeOptionName()).toContain("Caçador");
    act(() => vi.advanceTimersByTime(600));
    await user.keyboard("c"); // letra repetida: próxima com C
    expect(activeOptionName()).toContain("Curandeiro");
    act(() => vi.advanceTimersByTime(600));
    await user.keyboard("al");
    expect(activeOptionName()).toContain("Alquimista");
  });

  it("never lands on a disabled option when typing", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("b");
    expect(listbox()).toBeNull(); // só "Bruxo" começa com B, e está desabilitada
  });

  it("toggles with a click on the trigger", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    expect(listbox()).not.toBeNull();
    await userEvent.click(trigger());
    expect(listbox()).toBeNull();
  });

  it("chooses with a click on an option and ignores disabled ones", async () => {
    restoreMotion = mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Bruxo" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(listbox()).not.toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Caçador" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("c");
    expect(listbox()).toBeNull();
  });

  it("highlights the option under the mouse", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.hover(screen.getByRole("option", { name: "Curandeiro" }));
    expect(activeOptionName()).toContain("Curandeiro");
  });

  it("closes on an outside click without changing", async () => {
    restoreMotion = mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.click(document.body);
    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when the same option is chosen again", async () => {
    restoreMotion = mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Selecione" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks only the selected option with the check", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Caçador" }));
    await userEvent.click(trigger());
    expect(screen.getByRole("option", { name: "Caçador" })).toHaveTextContent("✓");
    expect(screen.getByRole("option", { name: "Alquimista" })).not.toHaveTextContent("✓");
  });

  it("keeps the list mounted but inert while closing, then unmounts on animation end", async () => {
    restoreMotion = mockReducedMotion(false);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    const list = document.querySelector("[role=listbox]") as HTMLElement;
    expect(list).not.toBeNull();
    expect(list).toHaveAttribute("aria-hidden", "true");
    expect(list).toHaveAttribute("inert");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    fireEvent.animationEnd(list);
    await waitFor(() => expect(document.querySelector("[role=listbox]")).toBeNull());
  });

  it("unmounts at once under reduced motion", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(trigger());
    expect(document.querySelector("[role=listbox]")).toBeNull();
  });

  it("does not open when disabled", async () => {
    render(<PillSelect aria-label="Classe" value="" options={OPTIONS} onChange={() => {}} disabled />);
    await userEvent.click(trigger());
    expect(listbox()).toBeNull();
    expect(trigger()).toHaveAttribute("aria-disabled", "true");
  });

  it("accepts aria-labelledby as the accessible name", () => {
    render(
      <>
        <span id="lbl">Mês</span>
        <PillSelect aria-labelledby="lbl" value="" options={OPTIONS} onChange={() => {}} />
      </>,
    );
    expect(screen.getByRole("combobox", { name: "Mês" })).toBeInTheDocument();
  });

  it("keeps focus on the trigger after clicking an option", async () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Caçador" }));
    expect(trigger()).toHaveFocus();
  });

  it("opens upward when below does not fit, with the outer radius intact", async () => {
    restoreMotion = mockReducedMotion(true);
    mockListHeight(220);
    pillRect = { top: 650, bottom: 707, left: 50, right: 393, width: 343, height: 57 };
    // O gatilho já está achatado no lado de baixo (lado padrão) quando a lista mede o raio.
    const realComputed = window.getComputedStyle.bind(window);
    const fake: Record<string, string> = {
      borderTopWidth: "4px",
      paddingLeft: "16px",
      paddingRight: "46px",
      borderTopLeftRadius: "28px",
      borderBottomLeftRadius: "0px",
    };
    const computedSpy = vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
      const real = realComputed(el, pseudo);
      if (el.getAttribute("role") !== "combobox") return real;
      return new Proxy(real, {
        get: (t, k: string) => (k in fake ? fake[k] : Reflect.get(t, k).bind?.(t) ?? Reflect.get(t, k)),
      });
    });
    render(<Harness />);
    try {
      await userEvent.click(trigger());
    } finally {
      computedSpy.mockRestore();
    }
    const list = screen.getByRole("listbox");
    expect(list.style.getPropertyValue("--pill-radius")).toBe("28px");
    expect(trigger()).toHaveAttribute("data-state", "open");
    // Lista acima, presa pela base na pílula (sobe 4 px sobre a borda: 768 - 654), sem `top`.
    expect(list.style.getPropertyValue("--fallback-bottom")).toBe("114px");
    expect(list.style.getPropertyValue("--fallback-top")).toBe("auto");
  });

  it("keeps a short upward list flush with the pill: anchored by the bottom, never by the top", async () => {
    restoreMotion = mockReducedMotion(true);
    pillRect = { top: 650, bottom: 707, left: 50, right: 393, width: 343, height: 57 };
    const bottoms: string[] = [];
    // Alturas diferentes (menores que o espaço de cima): a base da lista não pode se mover.
    for (const height of [90, 220]) {
      mockListHeight(height);
      const { unmount } = render(<Harness />);
      await userEvent.click(trigger());
      const list = screen.getByRole("listbox");
      expect(list.style.getPropertyValue("--fallback-top")).toBe("auto");
      expect(list.style.maxHeight).toBe(`${height}px`);
      bottoms.push(list.style.getPropertyValue("--fallback-bottom"));
      unmount();
      heightSpy?.mockRestore();
    }
    // Base da lista = topo da pílula + borda: innerHeight - bottom. A borda do jsdom é 0.
    expect(bottoms).toEqual([`${window.innerHeight - pillRect.top}px`, `${window.innerHeight - pillRect.top}px`]);
  });

  it("keeps the side chosen on open while scrolling, only re-measuring the height", async () => {
    restoreMotion = mockReducedMotion(true);
    pillRect = { top: 650, bottom: 707, left: 50, right: 393, width: 343, height: 57 };
    mockListHeight(300);
    render(<Harness />);
    await userEvent.click(trigger());
    const list = screen.getByRole("listbox");
    expect(list.style.getPropertyValue("--fallback-top")).toBe("auto");
    // A página rola: embaixo agora há muito mais espaço, mas a lista não troca de lado.
    pillRect = { top: 200, bottom: 257, left: 50, right: 393, width: 343, height: 57 };
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    const after = screen.getByRole("listbox");
    expect(after.style.getPropertyValue("--fallback-top")).toBe("auto");
    expect(after.style.getPropertyValue("--fallback-bottom")).toBe(`${window.innerHeight - 200}px`);
    // Rola de novo até pouco espaço em cima: encolhe naquele lado.
    pillRect = { top: 120, bottom: 177, left: 50, right: 393, width: 343, height: 57 };
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("listbox").style.maxHeight).toBe("112px");
  });

  it("closes when the chosen side has no room left for even one option", async () => {
    restoreMotion = mockReducedMotion(true);
    pillRect = { top: 650, bottom: 707, left: 50, right: 393, width: 343, height: 57 };
    mockListHeight(300);
    render(<Harness />);
    await userEvent.click(trigger());
    expect(listbox()).not.toBeNull();
    // Em cima sobram 30 px (38 - 8): menos que uma opção.
    pillRect = { top: 38, bottom: 95, left: 50, right: 393, width: 343, height: 57 };
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(listbox()).toBeNull();
  });

  it("closes without changing when the pill scrolls out of the viewport", async () => {
    restoreMotion = mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    expect(listbox()).not.toBeNull();
    pillRect = { top: 900, bottom: 957, left: 50, right: 393, width: 343, height: 57 };
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("repositions on scroll while the pill stays visible", async () => {
    restoreMotion = mockReducedMotion(true);
    mockListHeight(220);
    render(<Harness />);
    await userEvent.click(trigger());
    const before = screen.getByRole("listbox").style.getPropertyValue("--fallback-top");
    pillRect = { top: 120, bottom: 177, left: 50, right: 393, width: 343, height: 57 };
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("listbox").style.getPropertyValue("--fallback-top")).not.toBe(before);
  });

  it("removes the scroll and resize listeners on unmount", async () => {
    restoreMotion = mockReducedMotion(true);
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Harness />);
    await userEvent.click(trigger());
    unmount();
    for (const type of ["scroll", "resize"]) {
      const added = addSpy.mock.calls.find((c) => c[0] === type);
      expect(added).toBeDefined();
      expect(removeSpy.mock.calls.some((c) => c[0] === type && c[1] === added![1])).toBe(true);
    }
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("unmounts by a safety timeout when animationend never arrives", async () => {
    restoreMotion = mockReducedMotion(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness />);
    await user.click(trigger());
    await user.click(trigger());
    expect(document.querySelector("[role=listbox]")).not.toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(document.querySelector("[role=listbox]")).toBeNull();
    expect(trigger()).toHaveAttribute("data-state", "settling");
    act(() => vi.advanceTimersByTime(300));
    expect(trigger()).toHaveAttribute("data-state", "closed");
  });

  it("does not let list clicks reach React ancestors of the select", async () => {
    restoreMotion = mockReducedMotion(true);
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <PillSelect aria-label="Classe" value="" options={OPTIONS} onChange={() => {}} />
      </div>,
    );
    await userEvent.click(trigger());
    parentClick.mockClear();
    await userEvent.click(screen.getByRole("option", { name: "Caçador" }));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("pairs a unique anchor-name on the pill with the position-anchor of its list", async () => {
    restoreMotion = mockReducedMotion(true);
    render(
      <>
        <PillSelect aria-label="Classe" value="" options={OPTIONS} onChange={() => {}} />
        <PillSelect aria-label="Alinhamento" value="" options={OPTIONS} onChange={() => {}} />
      </>,
    );
    const [first, second] = screen.getAllByRole("combobox");
    const nameA = first.style.getPropertyValue("--pill-anchor");
    const nameB = second.style.getPropertyValue("--pill-anchor");
    expect(nameA).toMatch(/^--[\w-]+$/);
    expect(nameA).not.toBe(nameB);
    await userEvent.click(first);
    expect(screen.getByRole("listbox").style.getPropertyValue("--pill-anchor")).toBe(nameA);
  });
});
