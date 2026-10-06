import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { reactionAnchoredItems } from "../anchoredItems";
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
