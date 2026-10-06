import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ReactionPanel from "../ReactionPanel";

const nameOf = (id: string) => ({ c2: "Gon", c3: "Killua" })[id] ?? "?";

describe("ReactionPanel", () => {
  it("um grupo de botões por alvo, com o nome de cada um", () => {
    const onQuick = vi.fn();
    render(
      <ReactionPanel
        targets={[{ actorId: "c2", status: "available" }, { actorId: "c3", status: "attached" }]}
        nameOf={nameOf}
        onQuick={onQuick}
        onConfigure={vi.fn()}
      />,
    );
    expect(screen.getByText("Você é alvo")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Reagir — Gon" })).toBeInTheDocument();
    expect(screen.getByText("Reagir — Gon")).toBeInTheDocument();
    // O alvo que já reagiu mostra o estado, com o nome.
    expect(screen.getByText("Killua")).toBeInTheDocument();
    expect(screen.getByText("Reação enviada — aguardando o mestre")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("button", { name: /^Esquivar/ }), { key: "Enter" });
    expect(onQuick).toHaveBeenCalledWith("c2", "dodge");
  });

  it("segurar (Shift+Enter) configura o alvo certo", () => {
    const onConfigure = vi.fn();
    render(
      <ReactionPanel
        targets={[{ actorId: "c2", status: "available" }]}
        nameOf={nameOf}
        onQuick={vi.fn()}
        onConfigure={onConfigure}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: /^Repelir/ }), { key: "Enter", shiftKey: true });
    expect(onConfigure).toHaveBeenCalledWith("c2", "repel");
  });

  it("sem alvos não desenha nada", () => {
    const { container } = render(
      <ReactionPanel targets={[]} nameOf={nameOf} onQuick={vi.fn()} onConfigure={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
