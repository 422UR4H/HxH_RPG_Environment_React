import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClockPanel from "../ClockPanel";
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
    const { unmount } = setup();
    const panel = screen.getByRole("dialog", { name: "Controles do relógio" });
    expect(panel.contains(document.activeElement)).toBe(true);
    const pill = screen.getByRole("button", { name: "pill" });
    unmount();
    expect(document.activeElement === pill || !document.body.contains(pill)).toBe(true);
  });
});
