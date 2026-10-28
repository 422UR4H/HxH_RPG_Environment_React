import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
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
});
