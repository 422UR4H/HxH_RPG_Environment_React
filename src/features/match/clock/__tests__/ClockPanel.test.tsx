import { createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClockPanel from "../ClockPanel";
import { useStoryClock } from "../useStoryClock";
import type { StoryClockView } from "../useStoryClock";
import type { RoundMode } from "../../combat/combatMessages";

function view(over: Partial<StoryClockView> = {}): StoryClockView {
  return {
    now: "2000-01-01T08:30:00",
    running: false,
    limitAt: null,
    limitReason: "",
    realElapsedSeconds: 0,
    phase: "idle",
    pulseKey: 0,
    alertKey: 0,
    ...over,
  };
}

function setup(over: Partial<StoryClockView> = {}, roundMode: RoundMode | "" = "Free") {
  const handlers = {
    onAdjust: vi.fn(),
    onSet: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onClose: vi.fn(),
  };
  const anchorRef = createRef<HTMLDivElement>();
  const utils = render(
    <div>
      <div ref={anchorRef}>
        <button type="button">pill</button>
      </div>
      <button type="button">outside</button>
      <ClockPanel clock={view(over)} roundMode={roundMode} anchorRef={anchorRef} {...handlers} />
    </div>,
  );
  return { ...handlers, ...utils };
}

const describedText = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

describe("ClockPanel", () => {
  it("shows the big time, the date and the limit line with its reason", () => {
    setup({ limitAt: "2000-01-01T08:12:40", limitReason: "turn" });
    expect(screen.getByRole("button", { name: /Editar hora/ })).toHaveTextContent("08:30:00");
    expect(screen.getByText("01/01/2000")).toBeInTheDocument();
    expect(screen.getByTestId("clock-limit")).toHaveTextContent("Não volta antes de 08:12:40 — último turno");
  });

  it.each([
    ["start", "início da partida"],
    ["turn", "último turno"],
    ["scene", "troca de cena"],
    ["roundMode", "troca de regime"],
    ["round", "último round"],
  ] as const)("maps limit reason %s to its copy", (reason, copy) => {
    setup({ limitAt: "2000-01-01T08:00:00", limitReason: reason });
    expect(screen.getByTestId("clock-limit")).toHaveTextContent(`Não volta antes de 08:00:00 — ${copy}`);
  });

  it("applies +1 h and +1 min immediately", async () => {
    const { onAdjust } = setup();
    await userEvent.click(screen.getByRole("button", { name: "+1 h" }));
    await userEvent.click(screen.getByRole("button", { name: "+1 min" }));
    expect(onAdjust.mock.calls).toEqual([[3600], [60]]);
  });

  it("plays in the free regime", async () => {
    const { onPlay } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Tempo real/ }));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it("pauses while running and shows the real elapsed time", async () => {
    const { onPause } = setup({ running: true, phase: "running", realElapsedSeconds: 192 });
    expect(screen.getByText("ligado há 3 min 12 s")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Pausar/ }));
    expect(onPause).toHaveBeenCalledOnce();
  });

  it("disables play in Race and explains why", async () => {
    const { onPlay } = setup({}, "Race");
    const play = screen.getByRole("button", { name: /Tempo real/ });
    expect(play).toHaveAttribute("aria-disabled", "true");
    expect(describedText(play)).toContain("No turno disputado, cada round vale 1 segundo.");
    await userEvent.click(play);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("keeps the rewinds hidden until Mais opens level 2", async () => {
    const { onAdjust } = setup();
    expect(screen.queryByRole("button", { name: "+1 s" })).not.toBeInTheDocument();
    const more = screen.getByRole("button", { name: /Mais/ });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "+1 s" }));
    await userEvent.click(screen.getByRole("button", { name: "−1 h" }));
    await userEvent.click(screen.getByRole("button", { name: "−1 min" }));
    await userEvent.click(screen.getByRole("button", { name: "−1 s" }));
    expect(onAdjust.mock.calls).toEqual([[1], [-3600], [-60], [-1]]);
  });

  it("disables a rewind that would cross the limit, with the limit in a tooltip", async () => {
    const { onAdjust } = setup({ limitAt: "2000-01-01T08:29:30", limitReason: "turn" });
    await userEvent.click(screen.getByRole("button", { name: /Mais/ }));
    for (const name of ["−1 h", "−1 min"]) {
      const btn = screen.getByRole("button", { name });
      expect(btn).toHaveAttribute("aria-disabled", "true");
      expect(describedText(btn)).toContain("Não volta antes de 08:29:30 — último turno");
      await userEvent.click(btn);
    }
    const sec = screen.getByRole("button", { name: "−1 s" });
    expect(sec).not.toHaveAttribute("aria-disabled");
    await userEvent.click(sec);
    expect(onAdjust.mock.calls).toEqual([[-1]]);
  });

  it("opens the direct edit from the big time and goes back on cancel", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Editar hora/ }));
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+1 h" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "+1 h" })).toBeInTheDocument();
  });

  it("submits the direct edit through onSet", async () => {
    const { onSet } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Editar hora/ }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSet).toHaveBeenCalledWith("2000-01-02T08:30:00", false);
    expect(screen.getByRole("button", { name: "+1 h" })).toBeInTheDocument();
  });

  it("opens Passar dias preset to one day ahead", async () => {
    const { onSet } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Passar dias" }));
    expect(screen.getByText("02/01/2000")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSet).toHaveBeenCalledWith("2000-01-02T08:30:00", false);
  });

  it("sends the long-skip confirmation after the master confirms", async () => {
    const { onSet } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Passar dias" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSet).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Avançar" }));
    expect(onSet).toHaveBeenCalledWith("2000-01-04T08:30:00", true);
  });

  it("closes on Esc", async () => {
    const { onClose } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on pointerdown outside but not on the pill or inside", () => {
    const { onClose } = setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "pill" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "+1 h" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole("button", { name: "outside" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("moves focus into the panel on open and back to the pill on close", () => {
    const { rerender } = render(<Harness open />);
    const panel = screen.getByRole("dialog", { name: "Controles do relógio" });
    expect(panel.contains(document.activeElement)).toBe(true);
    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "pill" }));
  });

  it("does not steal focus that already moved outside before closing", () => {
    const { rerender } = render(<Harness open />);
    const outside = screen.getByRole("textbox", { name: "elsewhere" });
    outside.focus();
    rerender(<Harness open={false} />);
    expect(document.activeElement).toBe(outside);
  });

  it("closes only the long-skip confirmation on Esc", async () => {
    const { onClose, onSet } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Passar dias" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.getByRole("button", { name: "Avançar" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Avançar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSet).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe("with real time running", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    // fireEvent (e não userEvent): com relógio falso, os atrasos do userEvent travariam.
    it("measures the direct edit against the time it was opened at", () => {
      const { onSet } = renderRunning();
      fireEvent.click(screen.getByRole("button", { name: /Editar hora/ }));
      expect(
        screen.getByText("O tempo real continua correndo; Aplicar fixa a hora digitada."),
      ).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByText("sem mudança")).toBeInTheDocument();
      const apply = screen.getByRole("button", { name: "Aplicar" });
      expect(apply).toHaveAttribute("aria-disabled", "true");

      fireEvent.keyDown(screen.getByRole("textbox", { name: "Horas" }), { key: "ArrowUp" });
      expect(screen.getByText("+1 h")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByText("+1 h")).toBeInTheDocument();

      fireEvent.click(apply);
      expect(onSet).toHaveBeenCalledWith("2000-01-01T09:30:00", false);
    });
  });
});

function Harness({ open }: { open: boolean }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={anchorRef}>
        <button type="button">pill</button>
      </div>
      <input aria-label="elsewhere" />
      {open && (
        <ClockPanel
          clock={view()}
          roundMode="Free"
          anchorRef={anchorRef}
          onAdjust={() => {}}
          onSet={() => {}}
          onPlay={() => {}}
          onPause={() => {}}
          onClose={() => {}}
        />
      )}
    </div>
  );
}

function RunningPanel({ onSet }: { onSet: (storyAt: string, confirm: boolean) => void }) {
  const [receivedAt] = useState(() => Date.now());
  const clock = useStoryClock(
    {
      value: { storyAt: "2000-01-01T08:30:00", running: true, limitAt: null, limitReason: "", seq: 1 },
      receivedAt,
      lastChange: null,
      changeSeq: 0,
    },
    { escalate: true },
  );
  return (
    <ClockPanel
      clock={clock}
      roundMode="Free"
      onAdjust={() => {}}
      onSet={onSet}
      onPlay={() => {}}
      onPause={() => {}}
      onClose={() => {}}
    />
  );
}

function renderRunning() {
  const onSet = vi.fn();
  render(<RunningPanel onSet={onSet} />);
  return { onSet };
}
