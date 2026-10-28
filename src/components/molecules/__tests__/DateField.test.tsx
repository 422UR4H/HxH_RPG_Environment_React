import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DateField from "../DateField";

function Harness({
  initial,
  withTime,
  onChange,
}: {
  initial: string;
  withTime?: boolean;
  onChange: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DateField
      id="d"
      value={value}
      withTime={withTime}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("DateField", () => {
  it("shows the formatted value, or the placeholder when empty", () => {
    const { rerender } = render(<DateField id="d" value="2026-03-09" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("09/03/2026");
    rerender(<DateField id="d" value="2026-03-09T14:30" withTime onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("09/03/2026 às 14:30");
    rerender(<DateField id="d" value="" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("dd/mm/aaaa");
  });

  it("emits YYYY-MM-DD when a day is picked and closes the dialog", async () => {
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<Harness initial="2026-03-09" onChange={onChange} />);
    await u.click(screen.getByRole("button"));
    const dialog = screen.getByRole("dialog", { name: "Escolher data" });
    await u.click(within(dialog).getByRole("button", { name: /15 de março de 2026/i }));
    expect(onChange).toHaveBeenCalledWith("2026-03-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the day when the hour is changed with withTime", async () => {
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<Harness initial="2026-03-09T10:00" withTime onChange={onChange} />);
    await u.click(screen.getByRole("button"));
    await u.selectOptions(screen.getByLabelText("Hora"), "18");
    expect(onChange).toHaveBeenLastCalledWith("2026-03-09T18:00");
    await u.selectOptions(screen.getByLabelText("Minuto"), "45");
    expect(onChange).toHaveBeenLastCalledWith("2026-03-09T18:45");
  });

  it("closes on Escape and returns focus to the field", async () => {
    const u = userEvent.setup();
    render(<Harness initial="" onChange={() => {}} />);
    const trigger = screen.getByRole("button");
    await u.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("clears the value through the Limpar button", async () => {
    const onChange = vi.fn();
    const u = userEvent.setup();
    render(<Harness initial="2026-03-09" onChange={onChange} />);
    await u.click(screen.getByRole("button"));
    await u.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  describe("placement", () => {
    afterEach(() => vi.restoreAllMocks());

    // Campo em `top`/`bottom`; calendário com 300 px de altura; janela de 800 px.
    async function openAt(top: number) {
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
        this: HTMLElement,
      ) {
        const isDialog = this.getAttribute("role") === "dialog";
        const rect = isDialog
          ? { top: 0, bottom: 300, left: 0, right: 320, width: 320, height: 300 }
          : { top: top, bottom: top + 56, left: 20, right: 300, width: 280, height: 56 };
        return { ...rect, x: rect.left, y: rect.top, toJSON: () => rect };
      });
      const u = userEvent.setup();
      render(<Harness initial="" onChange={() => {}} />);
      await u.click(screen.getByRole("button"));
      return screen.getByRole("dialog");
    }

    it("opens below whenever it fits below", async () => {
      const dialog = await openAt(100);
      expect(getComputedStyle(dialog).top).toBe("calc(100% + 6px)");
    });

    it("opens above only when below does not fit but above does", async () => {
      const dialog = await openAt(600);
      expect(getComputedStyle(dialog).bottom).toBe("calc(100% + 6px)");
    });

    it("opens below, without shrinking, when it fits neither side", async () => {
      const dialog = await openAt(250);
      expect(getComputedStyle(dialog).top).toBe("calc(100% + 6px)");
    });
  });
});
