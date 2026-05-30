import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackgroundEditorModal from "../BackgroundEditorModal";

describe("BackgroundEditorModal — read-only", () => {
  it("shows the description rendered as markdown", () => {
    render(
      <BackgroundEditorModal
        initialValue="**Bold text**"
        readOnly
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Bold text").tagName).toBe("STRONG");
  });

  it("shows empty placeholder when description is empty", () => {
    render(
      <BackgroundEditorModal initialValue="" readOnly onClose={vi.fn()} />
    );
    expect(screen.getByText("Sem background registrado.")).toBeInTheDocument();
  });

  it("renders only a 'Fechar' button (no 'Salvar e Fechar')", () => {
    render(
      <BackgroundEditorModal initialValue="x" readOnly onClose={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Salvar e Fechar/ })
    ).not.toBeInTheDocument();
  });

  it("calls onClose when 'Fechar' is clicked", async () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal initialValue="x" readOnly onClose={onClose} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Esc is pressed (no dirty check in read-only)", async () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal initialValue="x" readOnly onClose={onClose} />
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
