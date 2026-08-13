import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useBackdropDismiss } from "../useBackdropDismiss";

function Harness({ onDismiss }: { onDismiss: () => void }) {
  const { onMouseDown, onMouseUp } = useBackdropDismiss(onDismiss);
  return (
    <div data-testid="overlay" onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
      <div data-testid="child">conteúdo</div>
    </div>
  );
}

describe("useBackdropDismiss", () => {
  it("dispara quando mousedown e mouseup acontecem no próprio backdrop", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    const overlay = getByTestId("overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("não dispara quando o mousedown começa em um filho e o mouseup termina no backdrop", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(getByTestId("child"));
    fireEvent.mouseUp(getByTestId("overlay"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("não dispara quando o mousedown começa no backdrop mas o mouseup termina em um filho", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(getByTestId("overlay"));
    fireEvent.mouseUp(getByTestId("child"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("não dispara quando os dois eventos acontecem no filho", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(getByTestId("child"));
    fireEvent.mouseUp(getByTestId("child"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("rearma a cada novo ciclo mousedown/mouseup (não trava em false)", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness onDismiss={onDismiss} />);
    const overlay = getByTestId("overlay");
    fireEvent.mouseDown(getByTestId("child"));
    fireEvent.mouseUp(overlay);
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
