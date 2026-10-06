import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { balloonAnchoredItems, reactionAnchoredItems } from "../anchoredItems";
import type { ReactionStatus } from "../reactionModel";

const controls = (targets: Array<{ actorId: string; status: ReactionStatus }>) => ({
  targets, quick: vi.fn(), configure: vi.fn(),
});
const nameOf = (id: string) => id.toUpperCase();

describe("reactionAnchoredItems", () => {
  it("no mapa, só o alvo com reação disponível ganha botões; o andamento fica no painel", () => {
    const items = reactionAnchoredItems(
      controls([
        { actorId: "a", status: "available" },
        { actorId: "b", status: "sending" },
        { actorId: "c", status: "attached" },
        { actorId: "d", status: "opened" },
      ]),
      nameOf,
    );
    expect(items.map((i) => i.characterId)).toEqual(["a"]);
    expect(items[0]).toMatchObject({ key: "reaction-a", placement: "below" });
  });

  it("os botões do item são os de reagir pelo alvo", () => {
    const [item] = reactionAnchoredItems(controls([{ actorId: "a", status: "available" }]), nameOf);
    render(<>{item.node}</>);
    expect(screen.getByRole("group", { name: "Reagir — A" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("depois de reagir, a peça fica sem nada embaixo", () => {
    expect(reactionAnchoredItems(controls([{ actorId: "a", status: "attached" }]), nameOf)).toEqual([]);
  });
});

describe("balloonAnchoredItems", () => {
  it("um balão por personagem: o ator que é alvo de si mesmo junta as duas linhas", () => {
    const items = balloonAnchoredItems([
      { characterId: "a", text: "−3", tone: "failure" },
      { characterId: "b", text: "sem dano", tone: "success" },
      { characterId: "a", text: "acertou 1 de 2", tone: "success" },
    ]);
    expect(items.map((i) => i.characterId)).toEqual(["a", "b"]);
    expect(items.map((i) => i.key)).toEqual(["balloon-a", "balloon-b"]);
    expect(items.every((i) => i.placement === "above")).toBe(true);

    render(<>{items[0].node}</>);
    const balloon = screen.getByRole("status");
    expect(balloon).toHaveTextContent("−3");
    expect(balloon).toHaveTextContent("acertou 1 de 2");
  });

  it("sem balões, sem itens", () => {
    expect(balloonAnchoredItems([])).toEqual([]);
  });
});
