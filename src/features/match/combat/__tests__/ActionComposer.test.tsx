import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActionComposer from "../ActionComposer";
import { chooseDestination, chooseTarget, draftVerdict, emptyDraft, resolveDraft } from "../actionDraft";
import type { ActionDraft, ReachContext } from "../actionDraft";
import { isSameSlot } from "../../../tactical-map/utils/coords";
import type { GridShape, SlotCoord } from "../../../../types/tacticalMap";

const catalogue = {
  weapons: [
    { name: "Fist", dice: [6, 6, 4], flatDamage: 0, defenseBonus: 0, proficiencyLevel: 0 },
    { name: "Sword", dice: [10, 4], flatDamage: 2, defenseBonus: 0, proficiencyLevel: 4 },
  ],
  skills: ["Push"],
};

const grid: GridShape = {
  kind: "square", cols: 14, rows: 10, cellSize: 64, skewRatio: 1, rotation: 0,
  color: "#fff", opacity: 1, lineStyle: "solid",
};
const sq = (col: number, row: number): SlotCoord => ({ kind: "square", col, row });
// Gon (ator) em (2,4); Hisoka longe em (8,4); Killua colado em (3,4).
const positions: Record<string, SlotCoord> = { gon: sq(2, 4), hisoka: sq(8, 4), killua: sq(3, 4) };
const ctx: ReachContext = {
  grid,
  actorSlot: positions.gon,
  actorZ: 0,
  slotOf: (id) => positions[id],
  isFree: (s) => !Object.values(positions).some((p) => isSameSlot(p, s)),
};
const nameOf = (id: string) => ({ gon: "Gon", hisoka: "Hisoka", killua: "Killua" }[id] ?? id);

/** O composer controlado de verdade: o rascunho vive aqui, como na página. */
function Harness({
  initial = emptyDraft(),
  onDeclare = () => {},
  canDeclare = true,
  blockedReason,
  spy,
}: {
  initial?: ActionDraft;
  onDeclare?: () => void;
  canDeclare?: boolean;
  blockedReason?: string;
  spy?: (d: ActionDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const resolved = resolveDraft(draft, ctx, "Dash");
  return (
    <ActionComposer
      actorName="Gon"
      draft={draft}
      resolved={resolved}
      verdict={draftVerdict(resolved)}
      catalogue={catalogue}
      gridKind="square"
      defaultCategory="Dash"
      nameOf={nameOf}
      onDraftChange={(d) => {
        spy?.(d);
        setDraft(d);
      }}
      onDeclare={onDeclare}
      canDeclare={canDeclare}
      blockedReason={blockedReason}
    />
  );
}

const moveToggle = () => screen.getByRole("button", { name: /Mover/ });
const attackToggle = () => screen.getByRole("button", { name: /Atacar/ });
const declare = () => screen.getByRole("button", { name: /^Declarar/ });

describe("ActionComposer", () => {
  it("nasce sem mover e sem atacar, e explica como começar", () => {
    render(<Harness />);
    expect(moveToggle()).toHaveAttribute("aria-pressed", "false");
    expect(attackToggle()).toHaveAttribute("aria-pressed", "false");
    expect(declare()).toBeDisabled();
    expect(screen.getByTestId("composer-hint")).toHaveTextContent(/Toque num espaço vazio/);
  });

  it("não oferece campo de perícia", () => {
    render(<Harness initial={chooseTarget(emptyDraft(), "killua")} />);
    expect(screen.queryByLabelText(/perícia/i)).toBeNull();
  });

  it("só movimento: com destino, declara movimento; Dash/Shift trocam a categoria", () => {
    const spy = vi.fn();
    render(<Harness initial={chooseDestination(emptyDraft(), [5, 4, 0])} spy={spy} />);
    expect(moveToggle()).toHaveAttribute("aria-pressed", "true");
    expect(attackToggle()).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("move-destination")).toHaveTextContent("coluna 6, linha 5");
    expect(declare()).toHaveTextContent("Declarar movimento");
    expect(screen.getByRole("radio", { name: "Dash" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Shift" }));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ category: "Shift" }));
    expect(screen.getByRole("radio", { name: "Shift" })).toHaveAttribute("aria-checked", "true");
  });

  it("ligar Mover sem destino trava o envio até tocar no mapa", () => {
    render(<Harness />);
    fireEvent.click(moveToggle());
    expect(moveToggle()).toHaveAttribute("aria-pressed", "true");
    expect(declare()).toBeDisabled();
    expect(screen.getByTestId("composer-hint")).toHaveTextContent(/escolher o destino/);
  });

  it("só ataque em alvo colado: não se move", () => {
    const onDeclare = vi.fn();
    render(<Harness initial={chooseTarget(emptyDraft(), "killua")} onDeclare={onDeclare} />);
    expect(moveToggle()).toHaveAttribute("aria-pressed", "false");
    expect(attackToggle()).toHaveAttribute("aria-pressed", "true");
    expect(declare()).toHaveTextContent("Declarar ataque");
    fireEvent.click(declare());
    expect(onDeclare).toHaveBeenCalled();
  });

  it("ataque em alvo longe liga a aproximação — e dá para desligar e atacar à distância", () => {
    render(<Harness initial={chooseTarget(emptyDraft(), "hisoka")} />);
    expect(moveToggle()).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("move-destination")).toHaveTextContent("ao lado de Hisoka");
    expect(declare()).toHaveTextContent("Declarar movimento + ataque");

    fireEvent.click(moveToggle());
    expect(moveToggle()).toHaveAttribute("aria-pressed", "false");
    expect(declare()).toHaveTextContent("Declarar ataque");
    expect(screen.getByText(/Hisoka está a 6 espaços/)).toBeInTheDocument();
  });

  it("escolhe a arma e remove o alvo pelo chip", () => {
    const spy = vi.fn();
    render(<Harness initial={chooseTarget(emptyDraft(), "killua")} spy={spy} />);
    expect(screen.getByRole("radio", { name: /Fist/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Sword/ }));
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ attack: { targets: ["killua"], weapon: "Sword" } }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remover Killua" }));
    expect(attackToggle()).toHaveAttribute("aria-pressed", "false");
    expect(declare()).toBeDisabled();
  });

  it("Limpar volta ao rascunho vazio", () => {
    render(<Harness initial={chooseTarget(chooseDestination(emptyDraft(), [2, 5, 0]), "killua")} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(moveToggle()).toHaveAttribute("aria-pressed", "false");
    expect(attackToggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("rascunho pronto mas conexão travada: desabilita e diz por quê", () => {
    render(
      <Harness
        initial={chooseTarget(emptyDraft(), "killua")}
        canDeclare={false}
        blockedReason="Sem conexão com a mesa."
      />,
    );
    expect(declare()).toBeDisabled();
    expect(screen.getByTestId("composer-hint")).toHaveTextContent("Sem conexão com a mesa.");
  });
});
