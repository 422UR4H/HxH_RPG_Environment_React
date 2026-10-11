import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import MatchErrorBanner from "../MatchErrorBanner";

const error = { code: "forbidden", message: "", at: 1 };

describe("MatchErrorBanner", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("só o × fecha; clicar no texto não", () => {
    const onDismiss = vi.fn();
    render(<MatchErrorBanner error={error} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText("Só o mestre pode fazer isso."));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("continua sumindo em 6 s", () => {
    const onDismiss = vi.fn();
    render(<MatchErrorBanner error={error} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(6000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
