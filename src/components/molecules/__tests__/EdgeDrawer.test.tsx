import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EdgeDrawer from "../EdgeDrawer";
import { mockReducedMotion } from "../../../test/reducedMotion";

let restoreMotion: () => void = () => {};

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <EdgeDrawer side="left" label="ABA" open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} width={300}>
      <p>conteudo</p>
    </EdgeDrawer>
  );
}

afterEach(() => {
  restoreMotion();
  vi.useRealTimers();
});

describe("EdgeDrawer", () => {
  it("keeps the panel mounted (inert) while closing and unmounts on animationend", () => {
    restoreMotion = mockReducedMotion(false);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    const content = screen.getByText("conteudo");
    expect(content).toBeInTheDocument();
    expect(content.closest("[inert]")).not.toBeNull();
    fireEvent.animationEnd(content.closest("[inert]")!);
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("unmounts immediately with reduced motion", () => {
    restoreMotion = mockReducedMotion(true);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("stays open when the tab is clicked mid-closing", () => {
    restoreMotion = mockReducedMotion(false);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    fireEvent.click(screen.getByText("ABA"));
    const content = screen.getByText("conteudo");
    expect(content.closest("[inert]")).toBeNull();
    fireEvent.animationEnd(content.parentElement!.parentElement!);
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });

  it("unmounts by itself if animationend never arrives", () => {
    vi.useFakeTimers();
    restoreMotion = mockReducedMotion(false);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(screen.getByText("conteudo")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("never scrolls horizontally inside the drawer body", () => {
    render(<Harness />);
    expect(screen.getByText("conteudo").parentElement).toHaveStyle({ "overflow-x": "hidden" });
  });
});
