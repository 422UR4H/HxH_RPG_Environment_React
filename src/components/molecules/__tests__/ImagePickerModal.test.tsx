import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImagePickerModal from "../ImagePickerModal";

describe("ImagePickerModal — backdrop click", () => {
  it("fecha quando mousedown e mouseup acontecem no backdrop", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="avatar" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("NÃO fecha quando um drag começa dentro do modal e termina no backdrop (bug do handle de crop)", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="avatar" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(screen.getByText("Adicionar Avatar"));
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("NÃO fecha quando mousedown começa no backdrop mas mouseup termina dentro do modal", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="avatar" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(screen.getByText("Adicionar Avatar"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ImagePickerModal — guarda de descarte", () => {
  async function preencherUrl(texto: string) {
    await userEvent.click(screen.getByRole("button", { name: /Colar link/ }));
    await userEvent.type(screen.getByPlaceholderText("Cole a URL da imagem aqui"), texto);
  }

  it("clique-fora fecha direto quando nada foi adicionado", () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clique-fora abre confirmação de descarte quando já há uma URL preenchida", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ Descartar imagem?")).toBeInTheDocument();
  });

  it("'Cancelar' fecha direto quando nada foi adicionado", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("'Cancelar' abre confirmação de descarte quando já há uma URL preenchida", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ Descartar imagem?")).toBeInTheDocument();
  });

  it("Escape abre confirmação de descarte quando já há uma URL preenchida", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("⚠ Descartar imagem?")).toBeInTheDocument();
  });

  it("Escape fecha direto quando nada foi adicionado", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("'Continuar editando' mantém o modal aberto e preserva o rascunho", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar editando" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText("⚠ Descartar imagem?")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Cole a URL da imagem aqui")).toHaveValue(
      "https://example.com/img.png"
    );
  });

  it("NÃO fecha nem abre a confirmação quando um drag começa dentro do modal (com conteúdo já adicionado) e termina no backdrop", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    const overlay = screen.getByTestId("image-picker-overlay");
    fireEvent.mouseDown(screen.getByRole("button", { name: /Colar link/ }));
    fireEvent.mouseUp(overlay);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText("⚠ Descartar imagem?")).not.toBeInTheDocument();
  });

  it("'Descartar' fecha o modal", async () => {
    const onClose = vi.fn();
    render(<ImagePickerModal type="cover" onConfirm={vi.fn()} onClose={onClose} />);
    await preencherUrl("https://example.com/img.png");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
