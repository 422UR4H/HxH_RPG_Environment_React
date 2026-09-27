import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneralBar from "../GeneralBar";
import OwnBars from "../OwnBars";
import QueuePanel from "../QueuePanel";
import CloseTurnRefusedDialog from "../CloseTurnRefusedDialog";
import EventStream from "../EventStream";

const nameOf = (id: string) => ({ c1: "Gon", c2: "Killua" }[id] ?? id);

/** U+2212 MINUS SIGN — o mesmo caractere que EventStream usa, não um hífen. */
const MINUS = "−";

describe("organismos da partida", () => {
  it("GeneralBar mostra a ordem projetada, maior key primeiro", () => {
    render(
      <GeneralBar
        nameOf={nameOf}
        bars={{
          seq: 1,
          prices: { action: 14 },
          characters: [],
          order: [
            { actorId: "c2", bars: ["action"], key: 12 },
            { actorId: "c1", bars: ["action"], key: 18 },
          ],
        }}
      />,
    );
    const rows = screen.getAllByTestId("order-row");
    expect(rows[0]).toHaveTextContent("Gon");
    expect(rows[1]).toHaveTextContent("Killua");
  });

  it("GeneralBar marca barra ausente do mapa de preços como 'ainda não precificou', não zero", () => {
    render(
      <GeneralBar
        nameOf={nameOf}
        bars={{
          seq: 1,
          prices: { action: 14 },
          characters: [],
          order: [],
        }}
      />,
    );
    expect(screen.getByTestId("price-action")).toHaveTextContent("14");
    const movePrice = screen.getByTestId("price-move");
    expect(movePrice).toHaveTextContent(/ainda não precificou/i);
    expect(movePrice).not.toHaveTextContent("0");
  });

  it("OwnBars mostra os saldos fracionários com uma casa decimal", () => {
    render(
      <OwnBars
        characterId="c1"
        bars={{
          seq: 1,
          prices: {},
          characters: [
            {
              characterId: "c1",
              actionBalance: -2.5,
              moveBalance: 3,
              actionSpeeds: [],
              moveSpeeds: [],
            },
          ],
          order: [],
        }}
      />,
    );
    expect(screen.getByTestId("balance-action")).toHaveTextContent("-2.5");
    expect(screen.getByTestId("balance-move")).toHaveTextContent("3.0");
  });

  it("OwnBars mostra o texto de vida quando hp é informado", () => {
    render(
      <OwnBars
        characterId="c1"
        bars={{
          seq: 1,
          prices: {},
          characters: [
            { characterId: "c1", actionBalance: 0, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
          ],
          order: [],
        }}
        hp={{ hp: 8, maxHp: 20 }}
      />,
    );
    expect(screen.getByText("8/20")).toBeInTheDocument();
  });

  it("QueuePanel antecipa uma ação pelo actionId", () => {
    const onPull = vi.fn();
    render(
      <QueuePanel
        nameOf={nameOf}
        queue={[{ actionId: "a1", actorId: "c1", bars: ["action"] }]}
        onPull={onPull}
        onOpenNext={vi.fn()}
        onCloseTurn={vi.fn()}
        canCloseTurn={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /antecipar/i }));
    expect(onPull).toHaveBeenCalledWith("a1");
  });

  it("CloseTurnRefusedDialog lista quem ficaria sem narrar e confirma", () => {
    const onConfirm = vi.fn();
    render(
      <CloseTurnRefusedDialog
        nameOf={nameOf}
        payload={{ turnId: "t1", pendingReactions: [{ reactionId: "r1", actorId: "c2", kind: "repel" }] }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/Killua/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /fechar mesmo assim/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("CloseTurnRefusedDialog não renderiza nada quando payload é null", () => {
    const { container } = render(
      <CloseTurnRefusedDialog
        nameOf={nameOf}
        payload={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("EventStream mostra o mais recente por último", () => {
    render(
      <EventStream
        nameOf={nameOf}
        events={[
          { kind: "turn_opened", at: 1, turnId: "t1", actorId: "c1" },
          { kind: "round_mode_changed", at: 2, mode: "Race" },
        ]}
      />,
    );
    const rows = screen.getAllByTestId("event-row");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent(/Race/);
  });

  it("EventStream mostra o dano projetado por alvo quando o turno fechado tem resolução", () => {
    render(
      <EventStream
        nameOf={nameOf}
        events={[
          {
            kind: "turn_closed",
            at: 1,
            turnId: "t1",
            resolution: {
              turnId: "t1",
              isSettled: true,
              targets: [
                { targetId: "c1", avoided: false, defended: false, rawDamage: 12, projectedDamage: 12 },
                { targetId: "c2", avoided: false, defended: false, rawDamage: 7, projectedDamage: 7 },
              ],
            },
          },
        ]}
      />,
    );
    const row = screen.getByTestId("event-row");
    expect(row).toHaveTextContent("Turno encerrado");
    expect(row).toHaveTextContent(`Gon ${MINUS}12`);
    expect(row).toHaveTextContent(`Killua ${MINUS}7`);
  });
});
