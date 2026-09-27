import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionComposer from "../ActionComposer";

const catalogue = {
  weapons: [
    { name: "Fist", dice: [6, 6, 4], flatDamage: 0, defenseBonus: 0, proficiencyLevel: 0 },
    { name: "Sword", dice: [10, 4], flatDamage: 2, defenseBonus: 0, proficiencyLevel: 4 },
  ],
  skills: ["Push"],
};

describe("ActionComposer", () => {
  it("monta o payload sem nenhum nome de perícia", () => {
    const onSubmit = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: ["c2"], weapon: "Sword", move: { category: "Dash", to: [3, 1, 0] } }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /declarar/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      actorId: "c1",
      targetId: ["c2"],
      attack: { weapon: "Sword" },
      move: { category: "Dash", from: [1, 1, 0], position: [3, 1, 0] },
    });
  });

  it("não oferece campo de perícia", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [] }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/perícia/i)).toBeNull();
  });

  it("oferece Dash e Shift, com Dash marcado", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [], move: { category: "Dash", to: [2, 1, 0] } }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("radio", { name: /dash/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /shift/i })).not.toBeChecked();
  });

  // R14: sem actorSlot, o movimento vai sem `from` — from é opcional no contrato e só
  // liga a checagem de parede no servidor.
  it("monta o move sem `from` quando não há actorSlot", () => {
    const onSubmit = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        draft={{ targets: [], move: { category: "Shift", to: [3, 1, 0] } }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /declarar/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      actorId: "c1",
      move: { category: "Shift", position: [3, 1, 0] },
    });
  });

  // R4: alvos são UUIDs de sheet/parede; nameOf traduz para exibição, e remover um alvo
  // migra o rascunho via onDraftChange(migrateTargets(...)).
  it("exibe nomes de alvo via nameOf e remove alvo migrando o rascunho", () => {
    const onDraftChange = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: ["c2", "c3"], weapon: "Sword" }}
        catalogue={catalogue}
        nameOf={(id) => (id === "c2" ? "Killua" : id)}
        onDraftChange={onDraftChange}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Killua")).toBeInTheDocument();
    expect(screen.getByText("c3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remover killua/i }));
    expect(onDraftChange).toHaveBeenCalledWith({
      targets: ["c3"],
      weapon: "Sword",
    });
  });

  // "Declarar" desabilitado quando o rascunho não tem alvo nem movimento.
  it("desabilita Declarar sem alvo e sem movimento", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [] }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /declarar/i })).toBeDisabled();
  });

  // Sem destino escolhido: radios mostram defaultCategory marcado, ficam desabilitados,
  // e o hint aparece ao lado.
  it("sem destino: radios desabilitados com defaultCategory marcado e hint visível", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [] }}
        catalogue={catalogue}
        defaultCategory="Shift"
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const dash = screen.getByRole("radio", { name: /dash/i });
    const shift = screen.getByRole("radio", { name: /shift/i });
    expect(dash).toBeDisabled();
    expect(shift).toBeDisabled();
    expect(shift).toBeChecked();
    expect(dash).not.toBeChecked();
    expect(screen.getByText(/clique num espaço livre para escolher o destino/i)).toBeInTheDocument();
  });

  // X explícito no nome do ator — nunca o clique de novo, que é alvejar a si mesmo.
  it("chama onClearActor ao clicar no X do nome do ator", () => {
    const onClearActor = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [] }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onClearActor={onClearActor}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /limpar ator/i }));
    expect(onClearActor).toHaveBeenCalled();
  });

  // Escolher arma edita o rascunho via onDraftChange.
  it("escolher arma seta draft.weapon via onDraftChange", () => {
    const onDraftChange = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [] }}
        catalogue={catalogue}
        onDraftChange={onDraftChange}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /sword/i }));
    expect(onDraftChange).toHaveBeenCalledWith({ targets: [], weapon: "Sword" });
  });

  // Final review, Important 2(b)/M4: canSubmit reúne "socket conectado" e "sem envio
  // pendente deste ator" — a página calcula os dois e passa um booleano só.
  it("desabilita Declarar quando canSubmit=false mesmo com alvo/movimento válido", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: ["c2"] }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        canSubmit={false}
      />,
    );
    expect(screen.getByRole("button", { name: /declarar/i })).toBeDisabled();
  });

  it("canSubmit omitido (default true) não desabilita quando há alvo/movimento", () => {
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: ["c2"] }}
        catalogue={catalogue}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /declarar/i })).not.toBeDisabled();
  });

  // Limpar destino escolhido (o "x" pequeno) seta move para undefined.
  it("limpar destino escolhido remove o move do rascunho", () => {
    const onDraftChange = vi.fn();
    render(
      <ActionComposer
        actorId="c1"
        actorName="Gon"
        actorSlot={[1, 1, 0]}
        draft={{ targets: [], move: { category: "Dash", to: [3, 1, 0] } }}
        catalogue={catalogue}
        onDraftChange={onDraftChange}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /limpar destino/i }));
    expect(onDraftChange).toHaveBeenCalledWith({ targets: [] });
  });
});
