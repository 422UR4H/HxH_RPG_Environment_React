import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { limitedHandlers } from "./limitedInput";

function Field({ max, initial }: { max: number; initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      aria-label="campo"
      value={value}
      {...limitedHandlers<HTMLInputElement>(max, value, setValue)}
    />
  );
}

// Simula uma composição de IME: o valor muda sem corte e o limite só vale no compositionend.
function compose(input: HTMLInputElement, caret: number, composed: string) {
  input.setSelectionRange(caret, caret);
  fireEvent.compositionStart(input);
  const next = input.value.slice(0, caret) + composed + input.value.slice(caret);
  fireEvent.input(input, { target: { value: next }, isComposing: true });
  expect(input.value).toBe(next); // durante a composição nada é cortado
  fireEvent.compositionEnd(input);
  // O Chrome move o cursor ao fim depois do compositionend: simulado aqui.
  setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 5);
}

const settle = () => new Promise((r) => setTimeout(r, 80));

describe("limitedHandlers with IME composition", () => {
  const full = "ABCDEFGHIJ😀😀MNOPQRSTUVWXYZ012345"; // 32 code points

  it("keeps the text intact and the caret at 0 when none of the composition fits", async () => {
    render(<Field max={32} initial={full} />);
    const input = screen.getByLabelText("campo") as HTMLInputElement;
    compose(input, 0, "ゴン");
    expect(input).toHaveValue(full);
    await settle();
    expect(input.selectionStart).toBe(0);
  });

  it("inserts only the part of the composition that fits, caret right after it", async () => {
    const initial = full.slice(0, -1); // 31 code points
    render(<Field max={32} initial={initial} />);
    const input = screen.getByLabelText("campo") as HTMLInputElement;
    compose(input, 0, "ゴン");
    expect(input).toHaveValue("ゴ" + initial);
    await settle();
    expect(input.selectionStart).toBe(1);
  });
});
