import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GridConfigPanel from "../GridConfigPanel";
import type { GridShape } from "../../../types/tacticalMap";

const defaultGrid: GridShape = {
  kind: "square",
  cols: 10,
  rows: 10,
  cellSize: 40,
  skewRatio: 1,
  rotation: 0,
  color: "#4a90a4",
  opacity: 0.6,
  lineStyle: "solid",
};

describe("GridConfigPanel", () => {
  it("renderiza botões de tipo e campos numéricos", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /quadrada/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hexagonal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/colunas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linhas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tamanho/i)).toBeInTheDocument();
  });

  it("clicar em Hexagonal chama onChange com kind hex", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /hexagonal/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "hex" }),
    );
  });

  it("alterar colunas chama onChange com novo valor numérico", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    const colsInput = screen.getByLabelText(/colunas/i);
    await userEvent.clear(colsInput);
    await userEvent.type(colsInput, "20");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ cols: 20 }),
    );
  });

  it("botão do tipo ativo está visualmente marcado", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} />);
    const squareBtn = screen.getByRole("button", { name: /quadrada/i });
    expect(squareBtn).toHaveAttribute("data-active", "true");
  });

  it("'Encaixar Grade' fica desabilitado sem imagem de fundo", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} onRefit={vi.fn()} canRefit={false} />);
    expect(screen.getByRole("button", { name: /encaixar grade/i })).toBeDisabled();
  });

  it("'Encaixar Grade' chama onRefit quando há imagem", async () => {
    const onRefit = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} onRefit={onRefit} canRefit />);
    await userEvent.click(screen.getByRole("button", { name: /encaixar grade/i }));
    expect(onRefit).toHaveBeenCalledOnce();
  });

  it("não expõe Rotação nem Perspectiva ao usuário (ocultos por ora)", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} />);
    expect(screen.queryByLabelText(/rotação/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/perspectiva/i)).not.toBeInTheDocument();
  });
});
