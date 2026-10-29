import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PillSelect, { type PillSelectOption } from "../PillSelect";

// O React só escuta animationend se o ambiente tiver AnimationEvent (jsdom não tem);
// precisa existir antes de o react-dom carregar.
vi.hoisted(() => {
  (window as unknown as { AnimationEvent: typeof Event }).AnimationEvent = class extends Event {};
});

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
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

const trigger = () => screen.getByRole("combobox", { name: "Classe" });
const listbox = () => screen.queryByRole("listbox");

function activeOptionName() {
  const id = trigger().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent : undefined;
}

describe("PillSelect", () => {
  it("exposes the combobox ARIA contract, closed and open", async () => {
    mockReducedMotion(true);
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
      mockReducedMotion(true);
      render(<Harness />);
      trigger().focus();
      await userEvent.keyboard(keys);
      expect(listbox()).not.toBeNull();
    },
  );

  it("opens on the first or last enabled option with Home and End", async () => {
    mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("{End}");
    expect(activeOptionName()).toContain("Curandeiro");
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Home}");
    expect(activeOptionName()).toContain("Selecione");
  });

  it("moves with arrows, skipping disabled options, and stops at the ends", async () => {
    mockReducedMotion(true);
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
    mockReducedMotion(true);
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
      mockReducedMotion(true);
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
    mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Escape}");
    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it("does not let Escape reach outer listeners while open", async () => {
    mockReducedMotion(true);
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
    mockReducedMotion(true);
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
    mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("c"); // abre em Caçador
    expect(listbox()).not.toBeNull();
    expect(activeOptionName()).toContain("Caçador");
    await new Promise((r) => setTimeout(r, 600));
    await userEvent.keyboard("c"); // letra repetida: próxima com C
    expect(activeOptionName()).toContain("Curandeiro");
    await new Promise((r) => setTimeout(r, 600));
    await userEvent.keyboard("al");
    expect(activeOptionName()).toContain("Alquimista");
  });

  it("never lands on a disabled option when typing", async () => {
    mockReducedMotion(true);
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard("b");
    expect(listbox()).toBeNull(); // só "Bruxo" começa com B, e está desabilitada
  });

  it("toggles with a click on the trigger", async () => {
    mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    expect(listbox()).not.toBeNull();
    await userEvent.click(trigger());
    expect(listbox()).toBeNull();
  });

  it("chooses with a click on an option and ignores disabled ones", async () => {
    mockReducedMotion(true);
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
    mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.hover(screen.getByRole("option", { name: "Curandeiro" }));
    expect(activeOptionName()).toContain("Curandeiro");
  });

  it("closes on an outside click without changing", async () => {
    mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.click(document.body);
    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when the same option is chosen again", async () => {
    mockReducedMotion(true);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Selecione" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks only the selected option with the check", async () => {
    mockReducedMotion(true);
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("option", { name: "Caçador" }));
    await userEvent.click(trigger());
    expect(screen.getByRole("option", { name: "Caçador" })).toHaveTextContent("✓");
    expect(screen.getByRole("option", { name: "Alquimista" })).not.toHaveTextContent("✓");
  });

  it("keeps the list mounted but inert while closing, then unmounts on animation end", async () => {
    mockReducedMotion(false);
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
    mockReducedMotion(true);
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
});
