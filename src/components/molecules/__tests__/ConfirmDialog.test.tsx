import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfirmDialog from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  it("uses default 'Cancelar' label when cancelLabel prop is not provided", () => {
    render(
      <ConfirmDialog
        message="msg"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("renders custom cancelLabel when provided", () => {
    render(
      <ConfirmDialog
        message="msg"
        confirmLabel="Descartar"
        cancelLabel="Manter editando"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Manter editando" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});
