import { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { renderWithProviders } from "../../../test/render";
import { useNavGuard } from "../../../contexts/NavGuardContext";
import PageHeader from "../PageHeader";

function Pathname() {
  return <span data-testid="pathname">{useLocation().pathname}</span>;
}

function BlockNavigation({ guard }: { guard: () => boolean }) {
  const { registerGuard } = useNavGuard();
  useEffect(() => {
    registerGuard(guard);
    return () => registerGuard(null);
  }, [registerGuard, guard]);
  return null;
}

describe("PageHeader — seta e logo", () => {
  it("a seta é um botão 'Voltar' que não envia formulário", () => {
    renderWithProviders(<PageHeader />);
    expect(screen.getByRole("button", { name: "Voltar" })).toHaveAttribute("type", "button");
  });

  it("a logo é um link para o início", () => {
    renderWithProviders(<PageHeader />);
    expect(screen.getByRole("link", { name: "System X System" })).toHaveAttribute("href", "/");
  });

  it("o Tab passa pela seta e depois pela logo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PageHeader />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Voltar" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "System X System" })).toHaveFocus();
  });

  it("o clique simples na logo navega para o início", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <PageHeader />
        <Pathname />
      </>,
      { route: "/campaigns" },
    );
    await user.click(screen.getByRole("link", { name: "System X System" }));
    await waitFor(() => expect(screen.getByTestId("pathname").textContent).toBe("/"));
  });

  it("com a trava de navegação recusando, o clique na logo não sai da página", async () => {
    const user = userEvent.setup();
    const guard = vi.fn(() => false);
    renderWithProviders(
      <>
        <BlockNavigation guard={guard} />
        <PageHeader />
        <Pathname />
      </>,
      { route: "/campaigns" },
    );
    await user.click(screen.getByRole("link", { name: "System X System" }));
    await waitFor(() => expect(guard).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("pathname").textContent).toBe("/campaigns");
  });
});
