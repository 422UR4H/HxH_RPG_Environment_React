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

describe("BackgroundEditorModal — edit (basic)", () => {
  it("renders a textarea pre-filled with initialValue", () => {
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("hello");
  });

  it("'Salvar e Fechar' calls onSave with current draft + onClose", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={onClose}
        onSave={onSave}
      />
    );
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "world");
    await userEvent.click(screen.getByRole("button", { name: "Salvar e Fechar" }));
    expect(onSave).toHaveBeenCalledWith("world");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("'Salvar e Fechar' is idempotent (calls onSave even when draft === initialValue)", async () => {
    const onSave = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar e Fechar" }));
    expect(onSave).toHaveBeenCalledWith("hello");
  });
});
