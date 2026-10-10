import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RollConditionEditor from "../RollConditionEditor";
import type { EditableRoll } from "../rollEdits";

const hit: EditableRoll = { key: "action:hit", field: "hit", label: "Acerto", allowsBias: true };
const defense: EditableRoll = { key: "r1:defense", actionId: "r1", field: "defense", label: "Defesa padrão", allowsBias: false };

describe("RollConditionEditor", () => {
  it("aplica viés, ajuste e motivo e fecha", () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(<RollConditionEditor roll={hit} onSend={onSend} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Vantagem" }));
    fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "-2" } });
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
    expect(screen.getByLabelText("Ajuste")).toHaveValue(3);
    expect(screen.getByLabelText("Motivo")).toHaveValue("chuva");
    fireEvent.click(screen.getByRole("button", { name: "Desfazer edição" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
  });

  it("sem condição em vigor não oferece Desfazer", () => {
    render(<RollConditionEditor roll={hit} onSend={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Desfazer edição" })).not.toBeInTheDocument();
  });

  it("leitura passiva: sem botões de viés, e o envio não leva viés", () => {
    const onSend = vi.fn();
    render(<RollConditionEditor roll={defense} onSend={onSend} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Vantagem" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ actionId: "r1", conditions: [{ field: "defense", modifier: 4 }] });
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
    fireEvent.change(screen.getByLabelText("Ajuste"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onSend).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
  });
});
