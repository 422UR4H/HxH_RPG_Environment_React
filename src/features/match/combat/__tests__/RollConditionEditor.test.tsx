import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RollConditionEditor from "../RollConditionEditor";
import type { EditableRoll } from "../rollEdits";

const hit: EditableRoll = { key: "action:hit", field: "hit", label: "Acerto", bias: "rolled" };
const defense: EditableRoll = { key: "r1:defense", actionId: "r1", field: "defense", label: "Defesa padrão", bias: "passive" };
const damage: EditableRoll = { key: "action:damage", field: "damage", label: "Dano", bias: "none" };

describe("RollConditionEditor", () => {
  it("aplica viés, ajuste e motivo e fecha", () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Vantagem" }));
    fireEvent.change(screen.getByLabelText("Modificador"), { target: { value: "-2" } });
    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "escuridao" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit", bias: 1, modifier: -2, description: "escuridao" }] });
    expect(onClose).toHaveBeenCalled();
  });

  it("abre com a condição em vigor e desfaz", () => {
    const onSend = vi.fn();
    render(
      <RollConditionEditor
        roll={{ ...hit, current: { bias: -1, modifier: 3, description: "chuva" } }}
        onSend={onSend}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Desvantagem" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Modificador")).toHaveValue(3);
    expect(screen.getByLabelText("Motivo")).toHaveValue("chuva");
    fireEvent.click(screen.getByRole("button", { name: "Desfazer edição" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
  });

  it("sem condição em vigor não oferece Desfazer", () => {
    render(<RollConditionEditor roll={hit} onSend={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Desfazer edição" })).not.toBeInTheDocument();
  });

  it("dano: sem viés nenhum, e o envio não leva viés", () => {
    const onSend = vi.fn();
    render(<RollConditionEditor roll={damage} onSend={onSend} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: /Viés/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vantagem" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Modificador"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "damage", modifier: 4 }] });
  });

  describe("leitura passiva: o viés fica atrás de Viés", () => {
    it("fechado de início, sem viés em vigor; abrir mostra o aviso, com o dado base, acima dos botões", () => {
      render(<RollConditionEditor roll={defense} passiveValue={11} onSend={() => {}} onClose={() => {}} />);
      const toggle = screen.getByRole("button", { name: /Viés/ });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("button", { name: "Vantagem" })).not.toBeInTheDocument();
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      const note = screen.getByText(
        "Este teste usa o dado base (11). Vantagem/Desvantagem passa a rolar contra o dado base.",
      );
      const advantage = screen.getByRole("button", { name: "Vantagem" });
      expect(note.compareDocumentPosition(advantage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("escolher Vantagem manda o viés, e o botão diz a escolha mesmo fechado", () => {
      const onSend = vi.fn();
      render(<RollConditionEditor roll={defense} onSend={onSend} onClose={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: /Viés/ }));
      fireEvent.click(screen.getByRole("button", { name: "Vantagem" }));
      fireEvent.click(screen.getByRole("button", { name: /Viés/ }));
      expect(screen.getByRole("button", { name: /Viés · Vantagem/ })).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
      expect(onSend).toHaveBeenCalledWith({ actionId: "r1", conditions: [{ field: "defense", bias: 1 }] });
    });

    it("com viés do sistema, já rola: aviso explícito com o dado base e botões à vista, sem o toggle", () => {
      render(
        <RollConditionEditor roll={{ ...defense, systemBias: -1 }} passiveValue={11} onSend={() => {}} onClose={() => {}} />,
      );
      expect(screen.getByRole("note")).toHaveTextContent("Este teste rola contra o dado base (11): o sistema pôs Desvantagem");
      expect(screen.queryByRole("button", { name: /Viés/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Vantagem" })).toBeInTheDocument();
    });

    it("com viés em vigor, abre com o cartão aberto e a escolha marcada", () => {
      render(
        <RollConditionEditor roll={{ ...defense, current: { bias: -1, modifier: 0 } }} onSend={() => {}} onClose={() => {}} />,
      );
      expect(screen.getByRole("button", { name: /Viés · Desvantagem/ })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("button", { name: "Desvantagem" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("Cancelar fecha sem mandar", () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("ajuste vazio ou inválido conta como zero", () => {
    const onSend = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Modificador"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
  });
});
