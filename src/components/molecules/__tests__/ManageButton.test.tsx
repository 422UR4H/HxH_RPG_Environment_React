import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockReducedMotion } from "../../../test/reducedMotion";
import ManageButton from "../ManageButton";

let restoreMotion: () => void = () => {};

afterEach(() => {
  restoreMotion();
});

const REASON = "Campanha com partida iniciada não pode ser excluída.";

function setup(deleteBlockedReason?: string) {
  restoreMotion = mockReducedMotion(true);
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <ManageButton
      isFloating
      confirmMessage="Tem certeza que deseja excluir?"
      deleteBlockedReason={deleteBlockedReason}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { onEdit, onDelete };
}

const trigger = () => screen.getByRole("button", { name: /Gerenciar/ });

describe("ManageButton", () => {
  it("opens and closes the actions menu, flipping the arrow", async () => {
    setup();
    expect(trigger()).toHaveTextContent("⚙ Gerenciar ▾");
    expect(screen.queryByRole("menu")).toBeNull();
    await userEvent.click(trigger());
    expect(trigger()).toHaveTextContent("⚙ Gerenciar ▴");
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(["Editar", "🗑Excluir"]);
    await userEvent.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("calls onEdit from Editar and closes the menu", async () => {
    const { onEdit } = setup();
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /Editar/ }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("asks for confirmation before deleting", async () => {
    const { onDelete } = setup();
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /Excluir/ }));
    expect(screen.getByText("Tem certeza que deseja excluir?")).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("keeps a blocked Excluir explained and inert, with the menu still open", async () => {
    const { onDelete } = setup(REASON);
    await userEvent.click(trigger());
    const del = screen.getByRole("menuitem", { name: /Excluir/ });
    expect(del).toHaveAttribute("aria-disabled", "true");
    expect(del).toHaveAccessibleDescription(REASON);
    await userEvent.click(del);
    expect(screen.queryByText("Tem certeza que deseja excluir?")).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});
