import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import GeneralBar from "../GeneralBar";
import OwnBars from "../OwnBars";
import QueuePanel from "../QueuePanel";
import CloseTurnRefusedDialog from "../CloseTurnRefusedDialog";
import EventStream from "../EventStream";
import DeclaredActions from "../DeclaredActions";
import MatchTopBar from "../MatchTopBar";
import ResolutionDetails from "../ResolutionDetails";
import type { BarsPayload, ResolutionPayload } from "../combatMessages";
import type { DeclaredAction, TableEvent } from "../combatReducer";

const nameOf = (id: string) => ({ c1: "Gon", c2: "Killua", n1: "Hisoka" }[id] ?? id);

// Nomes distintos do `nameOf` acima (c2/c3 têm outro sentido aqui) — usados pelos dois
// describes abaixo que compartilham a mesma resolução de exemplo (brief T9).
const res: ResolutionPayload = {
  turnId: "t1",
  isSettled: false,
  action: { skillName: "Accuracy", skillValue: 14, diceRolled: [6, 8], total: 20, isCritical: false, isCriticalFailure: false, margin: 3 },
  targets: [{
    targetId: "c2", avoided: false, defended: true, dodgeTotal: 12, defenseTotal: 15,
    rawDamage: 10, defenseApplied: 3, projectedDamage: 7,
    reaction: { kind: "repel", total: 17, reactionId: "r1", rung: "near_miss", margin: -3, difference: 3, stopsAttack: false },
    payouts: [{ amount: -3, bias: 0, applies: "action_speed", source: "system", againstKind: "anyone", againstId: "0", expiresAt: "next_turn", reason: "repel: near miss penalty" }],
  }],
  pendingReactions: [{ reactionId: "r2", actorId: "c3", kind: "dodge" }],
  errors: [{ subject: "c9", kind: "missing_sheet", detail: "x" }],
};
const resolutionNameOf = (id: string) => ({ c2: "Hisoka", c3: "Killua", c9: "Fantasma" }[id] ?? id);

/** U+2212 MINUS SIGN — o mesmo caractere que EventStream usa, não um hífen. */
const MINUS = "−";

const bars = (over: Partial<BarsPayload> = {}): BarsPayload => ({
  seq: 1, prices: {}, characters: [], order: [], ...over,
});

describe("GeneralBar", () => {
  it("mostra de quem é a vez e a ordem projetada, maior key primeiro", () => {
    render(
      <GeneralBar
        nameOf={nameOf}
        openTurnActorId="n1"
        highlightActorIds={new Set(["c1"])}
        bars={bars({
          order: [
            { actorId: "c2", bars: ["action"], key: 12 },
            { actorId: "c1", bars: ["action", "move"], key: 18 },
          ],
        })}
      />,
    );
    expect(screen.getByTestId("open-turn")).toHaveTextContent("Vez de Hisoka");
    const rows = screen.getAllByTestId("order-row");
    expect(rows[0]).toHaveTextContent("Gon");
    expect(rows[1]).toHaveTextContent("Killua");
  });

  it("só mostra preço de barra que já precificou — ausente não é zero", () => {
    render(<GeneralBar nameOf={nameOf} bars={bars({ prices: { action: 14 } })} />);
    expect(screen.getByTestId("prices")).toHaveTextContent("⚔ 14");
    expect(screen.getByTestId("prices")).not.toHaveTextContent("➜");
  });

  it("sem turno e sem ordem, diz isso em vez de sumir", () => {
    render(<GeneralBar nameOf={nameOf} bars={null} />);
    expect(screen.getByText("Nenhum turno aberto")).toBeInTheDocument();
    expect(screen.getByText("ordem vazia")).toBeInTheDocument();
    expect(screen.queryByTestId("prices")).toBeNull();
  });
});

describe("OwnBars", () => {
  it("mostra os saldos fracionários com sinal e uma casa decimal", () => {
    render(
      <OwnBars
        characterId="c1"
        bars={bars({
          characters: [
            { characterId: "c1", actionBalance: -2.5, moveBalance: 3, actionSpeeds: [], moveSpeeds: [] },
          ],
        })}
      />,
    );
    expect(screen.getByTestId("balance-action")).toHaveTextContent(`${MINUS}2.5`);
    expect(screen.getByTestId("balance-move")).toHaveTextContent("+3.0");
  });

  it("mostra a vida quando informada", () => {
    render(<OwnBars characterId="c1" bars={null} hp={{ hp: 13, maxHp: 20 }} />);
    expect(screen.getByLabelText("Vida 13 de 20")).toHaveTextContent("13/20");
  });
});

describe("QueuePanel", () => {
  it("abre uma ação fora de ordem pelo actionId e mostra o detalhe do que o mestre declarou", () => {
    const onPull = vi.fn();
    render(
      <QueuePanel
        nameOf={nameOf}
        queue={[
          { actionId: "a1", actorId: "c1", bars: ["action"] },
          { actionId: "a2", actorId: "n1", bars: ["move"] },
        ]}
        describe={(id) => (id === "a2" ? "Mover para coluna 3, linha 1 (Dash)" : undefined)}
        onPull={onPull}
      />,
    );
    const rows = screen.getAllByTestId("queue-row");
    expect(rows[0]).toHaveTextContent("Gon");
    expect(rows[1]).toHaveTextContent("Mover para coluna 3, linha 1 (Dash)");
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir agora" })[1]);
    expect(onPull).toHaveBeenCalledWith("a2");
  });

  it("fila vazia diz o que vai aparecer ali", () => {
    render(<QueuePanel nameOf={nameOf} queue={[]} onPull={() => {}} />);
    expect(screen.getByText(/Ninguém declarou nada ainda/)).toBeInTheDocument();
  });
});

describe("ResolutionDetails", () => {
  it("mostra acerto, alvo, reação, dano, reações pendentes e falta do motor", () => {
    render(<ResolutionDetails resolution={res} nameOf={resolutionNameOf} />);
    expect(screen.getByText(/Accuracy/)).toBeInTheDocument();
    expect(screen.getByText(/6 \+ 8/)).toBeInTheDocument();
    expect(screen.getByText("Hisoka")).toBeInTheDocument();
    expect(screen.getByText(/quase/i)).toBeInTheDocument(); // near_miss
    expect(screen.getByText(/10 → 7/)).toBeInTheDocument();
    expect(screen.getByText(/Killua/)).toBeInTheDocument();
    expect(screen.getByText(/incompleto/i)).toBeInTheDocument();
  });

  it("não tem botão nenhum (nasce só leitura)", () => {
    render(<ResolutionDetails resolution={res} nameOf={resolutionNameOf} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("QueuePanel — ação em andamento", () => {
  it("mostra no topo o card da ação aberta, marcado, com o cálculo anexado", () => {
    render(
      <QueuePanel
        queue={[{ actionId: "a2", actorId: "c3", bars: ["move"] }]}
        open={{ actorId: "c1", bars: ["action"], resolution: res }}
        nameOf={resolutionNameOf}
        onPull={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/queue-row|queue-open/);
    expect(rows[0]).toHaveAttribute("data-testid", "queue-open");
    expect(within(rows[0]).getByText(/em andamento/i)).toBeInTheDocument();
    expect(within(rows[0]).getByText("Hisoka")).toBeInTheDocument();
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument(); // sem "Abrir agora"
  });

  it("turno aberto ainda sem cálculo: o card aparece sem os números", () => {
    render(<QueuePanel queue={[]} open={{ actorId: "c1", resolution: null }} nameOf={resolutionNameOf} onPull={() => {}} />);
    expect(screen.getByTestId("queue-open")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cálculo do turno")).not.toBeInTheDocument();
  });
});

describe("CloseTurnRefusedDialog", () => {
  it("lista quem ficaria sem narrar e confirma", () => {
    const onConfirm = vi.fn();
    render(
      <CloseTurnRefusedDialog
        nameOf={nameOf}
        payload={{ turnId: "t1", pendingReactions: [{ reactionId: "r1", actorId: "c2", kind: "dodge" }] }}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/Killua/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar mesmo assim" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("não renderiza nada sem payload", () => {
    const { container } = render(
      <CloseTurnRefusedDialog nameOf={nameOf} payload={null} onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("EventStream", () => {
  const declared: DeclaredAction = {
    id: "a1", actorId: "c1", status: "open", fromComposer: true, at: 0,
    move: { category: "Dash", to: [4, 7, 0] },
    attack: { targets: ["n1"], weapon: "ThrowingDagger" },
  };

  it("conta o que aconteceu, o mais recente por último, com o detalhe do que EU declarei", () => {
    const events: TableEvent[] = [
      { kind: "turn_opened", at: 1, receivedAt: 1, turnId: "t1", actorId: "c1", mine: declared },
      {
        kind: "turn_closed", at: 2, receivedAt: 2, turnId: "t1", actorId: "c1",
        resolution: {
          turnId: "t1", isSettled: true,
          targets: [
            {
              targetId: "n1", avoided: false, defended: false, dodgeTotal: 0, defenseTotal: 0,
              rawDamage: 9, defenseApplied: 0, projectedDamage: 7,
            },
            {
              targetId: "c2", avoided: true, defended: false, dodgeTotal: 0, defenseTotal: 0,
              rawDamage: 0, defenseApplied: 0, projectedDamage: 0,
            },
          ],
        },
      },
      { kind: "hp_changed", at: 3, receivedAt: 3, characterId: "n1", hp: 13, maxHp: 20, damage: 7 },
      { kind: "round_mode_changed", at: 4, receivedAt: 4, mode: "Race" },
    ];
    render(<EventStream events={events} nameOf={nameOf} gridKind="square" />);
    const rows = screen.getAllByTestId("event-row");
    expect(rows[0]).toHaveTextContent(
      "Turno de Gon — mover para coluna 5, linha 8 (Dash) e atacar Hisoka com Throwing Dagger",
    );
    expect(rows[1]).toHaveTextContent(`Fim do turno de Gon — Hisoka ${MINUS}7, Killua esquivou`);
    expect(rows[2]).toHaveTextContent(`Hisoka: 13/20 (${MINUS}7)`);
    expect(rows[3]).toHaveTextContent("Regime: Disputado");
  });

  it("sem eventos, explica o que vai aparecer", () => {
    render(<EventStream events={[]} nameOf={nameOf} gridKind="square" />);
    expect(screen.getByText(/Nada aconteceu ainda/)).toBeInTheDocument();
  });
});

describe("DeclaredActions", () => {
  it("lista o que foi declarado com o status, e oculta sem cancelar", () => {
    const onHide = vi.fn();
    render(
      <DeclaredActions
        nameOf={nameOf}
        gridKind="square"
        onHide={onHide}
        declared={[
          { id: "a1", actorId: "c1", status: "queued", fromComposer: true, at: 0, attack: { targets: ["n1"] } },
          { id: "local-2", actorId: "c1", status: "sending", fromComposer: true, at: 1, move: { category: "Shift", to: [0, 0, 0] } },
        ]}
      />,
    );
    const rows = screen.getAllByTestId("declared-row");
    expect(rows[0]).toHaveTextContent("Atacar Hisoka");
    expect(rows[0]).toHaveTextContent("na fila");
    expect(rows[1]).toHaveTextContent("Mover para coluna 1, linha 1 (Shift)");
    expect(rows[1]).toHaveTextContent("enviando…");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar da lista" }));
    expect(onHide).toHaveBeenCalledWith("a1");
  });

  it("não ocupa espaço quando não há nada", () => {
    const { container } = render(<DeclaredActions nameOf={nameOf} gridKind="square" declared={[]} onHide={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("MatchTopBar", () => {
  it("oferece reconectar só quando a conexão caiu de vez", () => {
    const onReconnect = vi.fn();
    const { rerender } = render(
      <MatchTopBar roundMode="Free" status="connected" onReconnect={onReconnect} asideOpen={false} onToggleAside={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Reconectar" })).toBeNull();
    expect(screen.getByText("Livre")).toBeInTheDocument();

    rerender(
      <MatchTopBar roundMode="Free" status="disconnected" onReconnect={onReconnect} asideOpen={false} onToggleAside={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reconectar" }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it("diz que está esperando o mestre quando a sala não abriu", () => {
    render(<MatchTopBar roundMode="" status="waiting" asideOpen={false} onToggleAside={() => {}} />);
    expect(screen.getByTestId("ws-status")).toHaveAttribute("title", "Aguardando o mestre abrir a sala…");
  });
});
