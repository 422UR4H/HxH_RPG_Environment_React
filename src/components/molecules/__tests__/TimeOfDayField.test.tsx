import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimeOfDayField from "../TimeOfDayField";

function Harness({ initial = "", onChange }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <TimeOfDayField
      id="t"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("TimeOfDayField", () => {
  it("shows hour and minute from the value", () => {
    render(<Harness initial="08:30" />);
    expect(screen.getByLabelText("Hora")).toHaveValue("08");
    expect(screen.getByLabelText("Minuto")).toHaveValue("30");
  });

  it("emits HH:MM when both are typed", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Hora"), "21");
    await u.type(screen.getByLabelText("Minuto"), "05");
    expect(onChange).toHaveBeenLastCalledWith("21:05");
  });

  it("emits an empty string when both are cleared", async () => {
    const onChange = vi.fn();
    render(<Harness initial="08:30" onChange={onChange} />);
    const u = userEvent.setup();
    await u.clear(screen.getByLabelText("Hora"));
    await u.clear(screen.getByLabelText("Minuto"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("emits a half-filled value when only one part is typed", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.setup().type(screen.getByLabelText("Hora"), "08");
    expect(onChange).toHaveBeenLastCalledWith("08:");
  });

  it("ignores non-digits", async () => {
    render(<Harness />);
    await userEvent.setup().type(screen.getByLabelText("Hora"), "a1b");
    expect(screen.getByLabelText("Hora")).toHaveValue("1");
  });

  it("pads a single digit on blur", async () => {
    render(<Harness />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Minuto"), "5");
    await u.tab();
    expect(screen.getByLabelText("Minuto")).toHaveValue("05");
  });
});
