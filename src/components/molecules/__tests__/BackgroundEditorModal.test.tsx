import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("BackgroundEditorModal — dirty prompt", () => {
  it("Esc closes directly when draft is unchanged", async () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Descartar alterações/)).not.toBeInTheDocument();
  });

  it("Esc opens dirty-prompt when draft has changed", async () => {
    const onClose = vi.fn();
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={onClose}
        onSave={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, " world");
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(/Descartar alterações/)).toBeInTheDocument();
  });

  it("'Manter editando' closes only the prompt, draft preserved", async () => {
    render(
      <BackgroundEditorModal
        initialValue="hello"
        readOnly={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(textarea, " world");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Manter editando" }));
    expect(screen.queryByText(/Descartar alterações/)).not.toBeInTheDocument();
    expect(textarea.value).toBe("hello world");
  });

  it("'Descartar' closes everything without calling onSave", async () => {
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
    await userEvent.type(screen.getByRole("textbox"), " world");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("BackgroundEditorModal — paste HTML to markdown", () => {
  it("converts pasted HTML to markdown via turndown", () => {
    render(
      <BackgroundEditorModal
        initialValue=""
        readOnly={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.paste(textarea, {
      clipboardData: {
        types: ["text/html", "text/plain"],
        getData: (type: string) =>
          type === "text/html"
            ? "<p><strong>Bold</strong> and <em>italic</em></p>"
            : "Bold and italic",
      },
    });

    expect(textarea.value).toContain("**Bold**");
    expect(textarea.value).toContain("_italic_");
  });

  it("falls through to default behavior when clipboard has no HTML", async () => {
    render(
      <BackgroundEditorModal
        initialValue=""
        readOnly={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    await userEvent.type(textarea, "plain text");
    expect(textarea.value).toBe("plain text");
  });
});

describe("BackgroundEditorModal — formatting tip", () => {
  it("shows tip text in edit mode", () => {
    render(
      <BackgroundEditorModal
        initialValue=""
        readOnly={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(
      screen.getByText(/viram.*títulos.*listas/i)
    ).toBeInTheDocument();
  });

  it("does NOT show tip in read-only mode", () => {
    render(
      <BackgroundEditorModal
        initialValue="x"
        readOnly
        onClose={vi.fn()}
      />
    );
    expect(
      screen.queryByText(/viram.*títulos.*listas/i)
    ).not.toBeInTheDocument();
  });
});
