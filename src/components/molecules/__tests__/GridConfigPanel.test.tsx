import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GridConfigPanel from "../GridConfigPanel";
import type { GridShape } from "../../../types/tacticalMap";
import { applyTransform } from "../../../features/tactical-map/utils/coords";

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
  it("asks for a 44px touch area only on coarse pointers", () => {
    render(<GridConfigPanel grid={defaultGrid} onChange={() => {}} />);
    const css = Array.from(document.querySelectorAll("style")).map((el) => el.textContent ?? "").join("");
    expect(css).toMatch(/@media \(pointer: ?coarse\)\s*\{[^}]*min-height: ?44px/);
  });

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

  it("clicar em Isométrico aplica rotation 45 e skewRatio 0.5 mantendo o resto", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /isométrico/i }));
    expect(onChange).toHaveBeenCalledWith({ ...defaultGrid, rotation: 45, skewRatio: 0.5 });
  });

  it("clicar em Top-down aplica rotation 0 e skewRatio 1", async () => {
    const onChange = vi.fn();
    const iso = { ...defaultGrid, rotation: 45, skewRatio: 0.5 };
    render(<GridConfigPanel grid={iso} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /top-down/i }));
    expect(onChange).toHaveBeenCalledWith({ ...iso, rotation: 0, skewRatio: 1 });
  });

  it("digitar 30.5 em Rotação chama onChange com rotation 30.5", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    const input = screen.getByLabelText(/rotação/i);
    await userEvent.clear(input);
    await userEvent.type(input, "30.5");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: 30.5 }));
  });

  it("o número da Perspectiva aceita 0.42", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    const input = screen.getByLabelText(/valor da perspectiva/i);
    await userEvent.clear(input);
    await userEvent.type(input, "0.42");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ skewRatio: 0.42 }));
  });

  it("valores fora da faixa (Rotação 200, Perspectiva 0.1) não chamam onChange", async () => {
    const onChange = vi.fn();
    render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
    const rot = screen.getByLabelText(/rotação/i);
    await userEvent.clear(rot);
    await userEvent.click(rot);
    await userEvent.paste("200");
    const skew = screen.getByLabelText(/valor da perspectiva/i);
    await userEvent.clear(skew);
    await userEvent.click(skew);
    await userEvent.paste("0.1");
    expect(onChange).not.toHaveBeenCalled();
  });

  describe("input não fica com rascunho velho quando a grade muda por fora", () => {
    // Painel controlado: reflete o onChange como o toolbar real faz.
    function Harness({ initial }: { initial: GridShape }) {
      const [g, setG] = useState(initial);
      return <GridConfigPanel grid={g} onChange={setG} />;
    }

    it("predefinição depois de digitar Rotação mostra 45 no input", async () => {
      render(<Harness initial={defaultGrid} />);
      const rot = screen.getByLabelText(/rotação/i);
      await userEvent.clear(rot);
      await userEvent.type(rot, "30.5");
      await userEvent.click(screen.getByRole("button", { name: /isométrico/i }));
      expect(screen.getByLabelText(/rotação/i)).toHaveValue(45);
    });

    it("Top-down depois de digitar Rotação (que já era 0) mostra 0 no input", async () => {
      render(<Harness initial={defaultGrid} />);
      const rot = screen.getByLabelText(/rotação/i);
      await userEvent.clear(rot);
      await userEvent.click(rot);
      await userEvent.paste("30.5"); // um único onChange: prev=0
      await userEvent.click(screen.getByRole("button", { name: /top-down/i }));
      expect(screen.getByLabelText(/rotação/i)).toHaveValue(0);
    });

    it("Top-down depois de digitar Perspectiva (que já era 1) mostra 1 no input", async () => {
      render(<Harness initial={defaultGrid} />);
      const skew = screen.getByLabelText(/valor da perspectiva/i);
      await userEvent.clear(skew);
      await userEvent.click(skew);
      await userEvent.paste("0.42"); // um único onChange: prev=1
      await userEvent.click(screen.getByRole("button", { name: /top-down/i }));
      expect(screen.getByLabelText(/valor da perspectiva/i)).toHaveValue(1);
    });

    it("rotação vinda de fora (arraste da esfera) substitui o rascunho", async () => {
      const onChange = vi.fn();
      const { rerender } = render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
      const rot = screen.getByLabelText(/rotação/i);
      await userEvent.clear(rot);
      await userEvent.type(rot, "30.5");
      // Arrastar no canvas tira o foco do input antes de a grade mudar.
      await userEvent.tab();
      rerender(<GridConfigPanel grid={{ ...defaultGrid, rotation: 12 }} onChange={onChange} />);
      expect(screen.getByLabelText(/rotação/i)).toHaveValue(12);
    });

    it("perspectiva vinda de fora substitui o rascunho do número", async () => {
      const onChange = vi.fn();
      const { rerender } = render(<GridConfigPanel grid={defaultGrid} onChange={onChange} />);
      const skew = screen.getByLabelText(/valor da perspectiva/i);
      await userEvent.clear(skew);
      await userEvent.type(skew, "0.42");
      // Arrastar no canvas tira o foco do input antes de a grade mudar.
      await userEvent.tab();
      rerender(<GridConfigPanel grid={{ ...defaultGrid, skewRatio: 0.7 }} onChange={onChange} />);
      expect(screen.getByLabelText(/valor da perspectiva/i)).toHaveValue(0.7);
    });
  });

  it("em grade 45°/0.5, mudar Colunas mantém a grade ancorada (origem compensada)", async () => {
    const iso: GridShape = { ...defaultGrid, cols: 16, rows: 12, cellSize: 64, rotation: 45, skewRatio: 0.5 };
    const onChange = vi.fn();
    render(<GridConfigPanel grid={iso} onChange={onChange} />);
    const input = screen.getByLabelText(/colunas/i);
    await userEvent.clear(input);
    await userEvent.type(input, "17");
    const next = onChange.mock.calls[onChange.mock.calls.length - 1][0] as GridShape;
    expect(next.cols).toBe(17);
    const a = applyTransform({ x: 0, y: 0 }, iso);
    const b = applyTransform({ x: 0, y: 0 }, next);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });
});
