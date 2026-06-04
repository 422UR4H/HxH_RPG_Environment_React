import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InlineFeedback from "../InlineFeedback";

describe("InlineFeedback", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renderiza a mensagem", () => {
    render(<InlineFeedback message="Operação concluída" />);
    expect(screen.getByText("Operação concluída")).toBeInTheDocument();
  });

  it("sem autoDismissMs, persiste indefinidamente", () => {
    const onDismiss = vi.fn();
    render(<InlineFeedback message="Erro" onDismiss={onDismiss} />);
    vi.advanceTimersByTime(10000);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText("Erro")).toBeInTheDocument();
  });

  it("com autoDismissMs, chama onDismiss após o prazo", () => {
    const onDismiss = vi.fn();
    render(
      <InlineFeedback message="Salvo!" autoDismissMs={3000} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("reseta o timer quando a mensagem muda", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <InlineFeedback message="A" autoDismissMs={3000} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(2000);
    rerender(
      <InlineFeedback message="B" autoDismissMs={3000} onDismiss={onDismiss} />
    );
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
