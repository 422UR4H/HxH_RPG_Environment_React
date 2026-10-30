import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockReducedMotion } from "../../../test/reducedMotion";
import PillMenu, { type PillMenuItem } from "../PillMenu";

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
