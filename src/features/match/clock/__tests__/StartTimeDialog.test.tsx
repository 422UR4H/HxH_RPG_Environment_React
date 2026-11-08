import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StartTimeDialog from "../StartTimeDialog";

function setup(over: Partial<Parameters<typeof StartTimeDialog>[0]> = {}) {
  const onStart = vi.fn();
  const utils = render(<StartTimeDialog storyStartAt="2000-01-01" onStart={onStart} error={null} {...over} />);
  return { onStart, user: userEvent.setup(), ...utils };
}

describe("StartTimeDialog", () => {
  it("is a modal dialog with the fixed date and focus on the hour field", () => {
    setup();
    const dlg = screen.getByRole("dialog");
    expect(dlg).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Que horas são no início da partida?")).toBeInTheDocument();
    expect(screen.getByText("01/01/2000")).toBeInTheDocument();
    expect(screen.getByLabelText("Horas")).toHaveFocus();
  });

  it("is not dismissible: no cancel, Esc and outside click do nothing", async () => {
    const { user, onStart } = setup();
    expect(screen.queryByRole("button", { name: /cancelar|fechar|voltar/i })).toBeNull();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it("sends the zero-padded HH:MM:SS with seconds 00 by default", async () => {
    const { user, onStart } = setup();
    await user.keyboard("0805");
    await user.click(screen.getByRole("button", { name: "Começar" }));
    expect(onStart).toHaveBeenCalledWith("08:05:00");
  });

  it("offers seconds behind a toggle", async () => {
    const { user, onStart } = setup();
    expect(screen.queryByLabelText("Segundos")).toBeNull();
    await user.click(screen.getByRole("button", { name: "+ segundos" }));
    await user.click(screen.getByLabelText("Segundos"));
    await user.keyboard("0");
    await user.keyboard("7");
    await user.click(screen.getByRole("button", { name: "Começar" }));
    expect(onStart).toHaveBeenCalledWith("00:00:07");
  });

  it("shows the server error inline", () => {
    setup({ error: { code: "clock_already_set", message: "", sentType: "set_clock_start", at: 1 } });
    expect(screen.getByRole("alert").textContent).toContain("A hora inicial já foi definida.");
  });

  it("stays rendered after submitting and across rerenders (no local hiding)", async () => {
    const { user, rerender, onStart } = setup();
    await user.click(screen.getByRole("button", { name: "Começar" }));
    rerender(<StartTimeDialog storyStartAt="2000-01-01" onStart={onStart} error={null} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ignores a double click until the server answers with an error", async () => {
    const { user, onStart, rerender } = setup();
    const btn = screen.getByRole("button", { name: "Começar" });
    await user.dblClick(btn);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Começando…" })).toHaveAttribute("aria-disabled", "true");
    rerender(
      <StartTimeDialog storyStartAt="2000-01-01" onStart={onStart} error={{ code: "invalid_payload", message: "", sentType: "set_clock_start", at: 2 }} />,
    );
    await user.click(screen.getByRole("button", { name: "Começar" }));
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it("traps Tab inside the dialog", async () => {
    const { user } = setup();
    screen.getByRole("button", { name: "Começar" }).focus();
    await user.tab();
    expect(screen.getByLabelText("Horas")).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Começar" })).toHaveFocus();
  });
});
