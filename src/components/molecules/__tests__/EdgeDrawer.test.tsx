import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EdgeDrawer from "../EdgeDrawer";

// O React só escuta animationend se o ambiente tiver AnimationEvent (jsdom não tem);
// precisa existir antes de o react-dom carregar.
vi.hoisted(() => {
  (window as unknown as { AnimationEvent: typeof Event }).AnimationEvent = class extends Event {};
});

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <EdgeDrawer side="left" label="ABA" open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} width={300}>
      <p>conteudo</p>
    </EdgeDrawer>
  );
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("EdgeDrawer", () => {
  it("keeps the panel mounted (inert) while closing and unmounts on animationend", () => {
    mockReducedMotion(false);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    const content = screen.getByText("conteudo");
    expect(content).toBeInTheDocument();
    expect(content.closest("[inert]")).not.toBeNull();
    fireEvent.animationEnd(content.closest("[inert]")!);
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("unmounts immediately with reduced motion", () => {
    mockReducedMotion(true);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(screen.queryByText("conteudo")).not.toBeInTheDocument();
  });

  it("stays open when the tab is clicked mid-closing", () => {
    mockReducedMotion(false);
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    fireEvent.click(screen.getByText("ABA"));
    const content = screen.getByText("conteudo");
    expect(content.closest("[inert]")).toBeNull();
    fireEvent.animationEnd(content.parentElement!.parentElement!);
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });
});
