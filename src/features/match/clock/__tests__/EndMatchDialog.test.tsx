import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EndMatchDialog from "../EndMatchDialog";
import type { WsError } from "../../combat/combatErrorMessages";

type Props = Parameters<typeof EndMatchDialog>[0];

function setup(over: Partial<Props> = {}) {
  const onConfirm = vi.fn((_p: unknown) => true);
  const onCancel = vi.fn();
  const props: Props = {
    open: true,
    now: "2000-01-01T08:30:00",
    limitAt: "2000-01-01T08:00:00",
    limitReason: "turn",
    error: null,
    onConfirm,
    onCancel,
    ...over,
  };
  const view = render(<EndMatchDialog {...props} />);
  return { onConfirm, onCancel, props, ...view };
}

const CONFIRM_TEXT =
  "Encerrar a partida? Não dá para desfazer: depois de encerrada, a partida não volta para a mesa.";

describe("EndMatchDialog", () => {
  it("renders nothing while closed", () => {
    setup({ open: false });
    expect(screen.queryByText(CONFIRM_TEXT)).not.toBeInTheDocument();
  });

  it("asks for the irreversible confirmation first; Cancelar closes", async () => {
    const { onCancel, onConfirm } = setup();
    expect(screen.getByText(CONFIRM_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Encerrar partida" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Continuar opens the end-time dialog; submitting sends the exact time and the summary", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    const dialog = screen.getByRole("dialog", { name: "Encerrar partida" });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByText(CONFIRM_TEXT)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Resumo final/), "  Os heróis deixaram a ilha.  ");
    expect(screen.getByText("30/255")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));

    expect(onConfirm).toHaveBeenCalledWith({
      storyAt: "2000-01-02T08:30:00",
      briefFinalDescription: "Os heróis deixaram a ilha.",
      confirmLongSkip: false,
    });
  });

  it("summary is optional: an empty one is left out; the current time is a valid end", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onConfirm).toHaveBeenCalledWith({ storyAt: "2000-01-01T08:30:00", confirmLongSkip: false });
  });

  it("caps the summary at 255 characters", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText(/Resumo final/)).toHaveAttribute("maxLength", "255");
  });

  it("freezes the edit base when the dialog opens (real time keeps ticking outside)", async () => {
    const { onConfirm, rerender, props } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    rerender(<EndMatchDialog {...props} now="2000-01-01T08:30:05" />);
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onConfirm).toHaveBeenCalledWith({ storyAt: "2000-01-01T08:30:00", confirmLongSkip: false });
  });

  it("does not go below the limit", async () => {
    const { onConfirm } = setup({ now: "2000-01-01T08:30:00", limitAt: "2000-01-01T08:30:00" });
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Dia anterior" }));
    const submit = screen.getByRole("button", { name: "Encerrar partida" });
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(submit);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("a long skip forward is sent only after the master confirms it", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /^Avançar/ }));
    expect(onConfirm).toHaveBeenCalledWith({ storyAt: "2000-01-04T08:30:00", confirmLongSkip: true });
  });

  it("shows the server refusal inline and lets the master try again", async () => {
    const { onConfirm, rerender, props } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Esperando o servidor: um 2º clique não reenvia.
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    const error: WsError = { code: "clock_below_limit", message: "below", sentType: "end_match", at: 1 };
    rerender(<EndMatchDialog {...props} error={error} />);
    // O mínimo do front não sabe do +1 s do round em andamento: a recusa explica isso.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A hora do fim não pode ficar antes do mínimo (o round em andamento soma 1 s).",
    );
    await userEvent.click(screen.getByRole("button", { name: "Encerrar partida" }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("reopening starts again from the confirmation", async () => {
    const { rerender, props } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    rerender(<EndMatchDialog {...props} open={false} />);
    rerender(<EndMatchDialog {...props} open />);
    expect(screen.getByText(CONFIRM_TEXT)).toBeInTheDocument();
  });
});
