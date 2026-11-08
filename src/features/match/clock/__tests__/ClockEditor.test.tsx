import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ClockEditor, { TimeFields } from "../ClockEditor";
import type { TimeValue } from "../ClockEditor";

const BASE = "2000-01-31T14:32:07";

function setup(over: Partial<Parameters<typeof ClockEditor>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <ClockEditor
      base={BASE}
      minimum={null}
      submitLabel="Aplicar"
      cancelLabel="Cancelar"
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...over}
    />,
  );
  return { onSubmit, onCancel, user: userEvent.setup() };
}

const hours = () => screen.getByLabelText("Horas") as HTMLInputElement;
const minutes = () => screen.getByLabelText("Minutos") as HTMLInputElement;
const seconds = () => screen.getByLabelText("Segundos") as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: "Aplicar" });

afterEach(() => vi.useRealTimers());

describe("ClockEditor", () => {
  it("renders the base date and time", () => {
    setup();
    expect(screen.getByText("31/01/2000")).toBeInTheDocument();
    expect(hours().value).toBe("14");
    expect(minutes().value).toBe("32");
    expect(seconds().value).toBe("07");
  });

  it("day stepper crosses the month boundary", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Próximo dia" }));
    expect(screen.getByText("01/02/2000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dia anterior" }));
    await user.click(screen.getByRole("button", { name: "Dia anterior" }));
    expect(screen.getByText("30/01/2000")).toBeInTheDocument();
  });

  it("holding the day stepper repeats after 400 ms, then every 120 ms", () => {
    vi.useFakeTimers();
    setup();
    const next = screen.getByRole("button", { name: "Próximo dia" });
    fireEvent.pointerDown(next);
    expect(screen.getByText("01/02/2000")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(399));
    expect(screen.getByText("01/02/2000")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("02/02/2000")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(240));
    expect(screen.getByText("04/02/2000")).toBeInTheDocument();
    fireEvent.pointerUp(next);
    // O clique do ponteiro (detail ≥ 1) já foi contado no pointerdown.
    fireEvent.click(next, { detail: 1 });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("04/02/2000")).toBeInTheDocument();
  });

  it("a keyboard click steps once even after a pointerdown that left without clicking", async () => {
    const { user } = setup();
    const next = screen.getByRole("button", { name: "Próximo dia" });
    fireEvent.pointerDown(next);
    fireEvent.pointerLeave(next);
    expect(screen.getByText("01/02/2000")).toBeInTheDocument();
    next.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("02/02/2000")).toBeInTheDocument();
    await user.keyboard(" ");
    expect(screen.getByText("03/02/2000")).toBeInTheDocument();
  });

  it("typing 25 in hours clamps to 23 and moves to minutes", async () => {
    const { user } = setup();
    await user.click(hours());
    await user.keyboard("25");
    expect(hours().value).toBe("23");
    expect(minutes()).toHaveFocus();
  });

  it("clamps a single typed digit on blur", async () => {
    const { user } = setup();
    await user.click(minutes());
    await user.keyboard("7");
    expect(minutes().value).toBe("7");
    await user.tab();
    expect(minutes().value).toBe("07");
  });

  it("ArrowUp carries into the next unit and across midnight", async () => {
    const { user } = setup({ base: "2000-01-01T23:59:59" });
    await user.click(seconds());
    await user.keyboard("{ArrowUp}");
    expect(seconds().value).toBe("00");
    expect(minutes().value).toBe("00");
    expect(hours().value).toBe("00");
    expect(screen.getByText("02/01/2000")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(hours().value).toBe("23");
    expect(screen.getByText("01/01/2000")).toBeInTheDocument();
  });

  it("PageUp steps by ten", async () => {
    const { user } = setup();
    await user.click(minutes());
    await user.keyboard("{PageUp}");
    expect(minutes().value).toBe("42");
  });

  it("previews the target and the delta", async () => {
    const { user } = setup();
    expect(screen.getByText("sem mudança")).toBeInTheDocument();
    expect(submit()).toHaveAttribute("aria-disabled", "true");
    await user.click(hours());
    await user.keyboard("16");
    await user.keyboard("42");
    expect(screen.getByText("→ 16:42:07")).toBeInTheDocument();
    expect(screen.getByText("+2 h 10 min")).toBeInTheDocument();
    expect(submit()).not.toHaveAttribute("aria-disabled");
  });

  it("allowUnchanged submits the base as is", async () => {
    const { user, onSubmit } = setup({ allowUnchanged: true, minimum: BASE });
    expect(submit()).not.toHaveAttribute("aria-disabled");
    await user.click(submit());
    expect(onSubmit).toHaveBeenCalledWith(BASE, false);
  });

  it("below the minimum disables submit and shows the reason", async () => {
    const { user, onSubmit } = setup({ minimum: "2000-01-31T08:12:40", minimumReason: "último turno" });
    await user.click(hours());
    await user.keyboard("07");
    expect(screen.getByText("Não volta antes de 08:12:40 — último turno")).toBeInTheDocument();
    expect(submit()).toHaveAttribute("aria-disabled", "true");
    await user.click(submit());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("long skip opens the confirm and submits with true", async () => {
    const { user, onSubmit } = setup();
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Próximo dia" }));
    await user.click(submit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText("Avançar +3 dias? Os personagens perdem os dias de treino desse período."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Avançar" }));
    expect(onSubmit).toHaveBeenCalledWith("2000-02-03T14:32:07", true);
  });

  it("backing out of the long-skip confirm does not submit", async () => {
    const { user, onSubmit } = setup();
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: "Próximo dia" }));
    await user.click(submit());
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText(/Os personagens perdem/)).not.toBeInTheDocument();
  });

  it("exactly two days forward submits with false", async () => {
    const { user, onSubmit } = setup();
    for (let i = 0; i < 2; i++) await user.click(screen.getByRole("button", { name: "Próximo dia" }));
    await user.click(submit());
    expect(onSubmit).toHaveBeenCalledWith("2000-02-02T14:32:07", false);
  });

  it("starts from initial and cancels", async () => {
    const { user, onCancel } = setup({ initial: "2000-02-01T14:32:07" });
    expect(screen.getByText("01/02/2000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("hides seconds when showSeconds is false", () => {
    setup({ showSeconds: false });
    expect(screen.queryByLabelText("Segundos")).not.toBeInTheDocument();
  });
});

describe("TimeFields", () => {
  function Harness({ onCarry }: { onCarry: (d: number) => void }) {
    const [v, setV] = useState<TimeValue>({ h: 23, mi: 59, s: 0 });
    return (
      <TimeFields
        value={v}
        showSeconds={false}
        onChange={(next, carry) => {
          setV(next);
          onCarry(carry ?? 0);
        }}
      />
    );
  }

  it("wraps past midnight and reports the day carry", async () => {
    const onCarry = vi.fn();
    render(<Harness onCarry={onCarry} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Minutos"));
    await user.keyboard("{ArrowUp}");
    expect((screen.getByLabelText("Horas") as HTMLInputElement).value).toBe("00");
    expect(onCarry).toHaveBeenLastCalledWith(1);
  });
});
