import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavGuardProvider, useNavGuard } from "../NavGuardContext";

// Componente de teste que usa confirmNavigation
function TestButton({ label, onNav }: { label: string; onNav: () => void }) {
  const { confirmNavigation } = useNavGuard();
  return (
    <button
      onClick={async () => {
        if (await confirmNavigation()) onNav();
      }}
    >
      {label}
    </button>
  );
}

// Componente que registra um guard que sempre retorna `allowNav`
function GuardRegistrar({ allowNav }: { allowNav: boolean }) {
  const { registerGuard } = useNavGuard();
  registerGuard(() => Promise.resolve(allowNav));
  return null;
}

describe("NavGuardContext", () => {
  it("sem guard, confirmNavigation resolve true imediatamente", async () => {
    const onNav = vi.fn();
    render(
      <NavGuardProvider>
        <MemoryRouter>
          <TestButton label="Ir" onNav={onNav} />
        </MemoryRouter>
      </NavGuardProvider>
    );
    fireEvent.click(screen.getByText("Ir"));
    await waitFor(() => expect(onNav).toHaveBeenCalledOnce());
  });

  it("com guard que retorna true, navega", async () => {
    const onNav = vi.fn();
    render(
      <NavGuardProvider>
        <MemoryRouter>
          <GuardRegistrar allowNav={true} />
          <TestButton label="Ir" onNav={onNav} />
        </MemoryRouter>
      </NavGuardProvider>
    );
    fireEvent.click(screen.getByText("Ir"));
    await waitFor(() => expect(onNav).toHaveBeenCalledOnce());
  });

  it("com guard que retorna false, NÃO navega", async () => {
    const onNav = vi.fn();
    render(
      <NavGuardProvider>
        <MemoryRouter>
          <GuardRegistrar allowNav={false} />
          <TestButton label="Ir" onNav={onNav} />
        </MemoryRouter>
      </NavGuardProvider>
    );
    fireEvent.click(screen.getByText("Ir"));
    await new Promise((r) => setTimeout(r, 50));
    expect(onNav).not.toHaveBeenCalled();
  });
});
