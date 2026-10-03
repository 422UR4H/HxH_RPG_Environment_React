import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import GeneralBar from "../GeneralBar";
import CharacterBarsStrip, { fmt } from "../CharacterBarsStrip";
import OwnBars from "../OwnBars";
import QueuePanel from "../QueuePanel";
import CloseTurnRefusedDialog from "../CloseTurnRefusedDialog";
import EventStream from "../EventStream";
import DeclaredActions from "../DeclaredActions";
import MatchTopBar from "../MatchTopBar";
import ResolutionDetails from "../ResolutionDetails";
import { avoidedVerb } from "../combatText";
import type { BarsPayload, ResolutionPayload } from "../combatMessages";
import type { DeclaredAction, TableEvent } from "../combatReducer";
import { historyRows } from "../historyRows";
import type { HistoryMasterAction, HistoryTurn, MatchHistory } from "../../../../types/matchHistory";

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

// Fixture do brief (T12): um personagem em Disputado, com as duas velocidades que agiram e
// uma chave de ordem. Nome `raceBars` — evita colidir com a factory `bars(...)` acima.
const raceBars: BarsPayload = {
  seq: 1,
  prices: { action: 14, move: 12 },
  characters: [{ characterId: "c1", actionBalance: -2.5, moveBalance: 3, actionSpeeds: [16, 14], moveSpeeds: [] }],
  order: [{ actorId: "c1", bars: ["action"], key: 18 }],
};

describe("GeneralBar", () => {
  it("mostra de quem é a vez e a ordem projetada, maior key primeiro", () => {
    render(
      <GeneralBar
        nameOf={nameOf}
        roundMode=""
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
    render(<GeneralBar nameOf={nameOf} roundMode="" bars={bars({ prices: { action: 14 } })} />);
    expect(screen.getByTestId("prices")).toHaveTextContent("⚔ 14");
    expect(screen.getByTestId("prices")).not.toHaveTextContent("➜");
  });

  it("sem turno e sem ordem, diz isso em vez de sumir", () => {
    render(<GeneralBar nameOf={nameOf} roundMode="" bars={null} />);
    expect(screen.getByText("Nenhum turno aberto")).toBeInTheDocument();
    expect(screen.getByText("ordem vazia")).toBeInTheDocument();
    expect(screen.queryByTestId("prices")).toBeNull();
  });

  it("mostra a key de cada slot", () => {
    render(<GeneralBar bars={raceBars} roundMode="Race" nameOf={() => "Gon"} />);
    expect(screen.getByTestId("order-row")).toHaveTextContent("18");
  });
});

describe("CharacterBarsStrip", () => {
  it("Disputado: saldo com uma casa, velocidades e média", () => {
    render(<CharacterBarsStrip bars={raceBars} roundMode="Race" nameOf={nameOf} />);
    expect(screen.getByText("Gon")).toBeInTheDocument();
    expect(screen.getByText(`${MINUS}2.5`)).toBeInTheDocument();
    expect(screen.getByText("16 · 14")).toBeInTheDocument();
    expect(screen.getByText("x̄ 15")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(2);
  });

  it("Livre: sem barras nem média, só as velocidades", () => {
    render(<CharacterBarsStrip bars={{ ...raceBars, prices: {} }} roundMode="Free" nameOf={nameOf} />);
    expect(screen.queryAllByRole("meter")).toHaveLength(0);
    expect(screen.queryByText(/x̄/)).not.toBeInTheDocument();
    expect(screen.getByText("16 · 14")).toBeInTheDocument();
  });

  it("barra sem preço não é desenhada", () => {
    render(<CharacterBarsStrip bars={{ ...raceBars, prices: { action: 14 } }} roundMode="Race" nameOf={nameOf} />);
    expect(screen.getAllByRole("meter")).toHaveLength(1);
  });
});

describe("fmt (CharacterBarsStrip)", () => {
  it("negativo que arredonda para zero perde o sinal — não existe \"−0\"", () => {
    expect(fmt(-0.04)).toBe("0");
    expect(fmt(-0.049)).toBe("0");
  });

  it("zero é \"0\", sem sinal", () => {
    expect(fmt(0)).toBe("0");
  });

  it("inteiro não ganha \".0\"", () => {
    expect(fmt(3)).toBe("3");
  });

  it("negativo de verdade mantém o sinal e a casa decimal", () => {
    expect(fmt(-2.5)).toBe(`${MINUS}2.5`);
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

// T13/F1: a declaração inteira de uma ação na fila do mestre (actionwire.Full, B1) — o mesmo
// formato do histórico, reusado em action_queued/match_full_state.queue.
const fullAction = {
  uuid: "a2",
  actorId: "n1",
  reactionKind: "",
  targetId: ["c1"],
  speed: { bar: 0, rollCheck: { skillName: "Legerity", skillValue: 0, attempts: { primary: [6, 8] }, result: 14 } },
  move: {
    category: "Dash",
    from: [1, 1, 0] as [number, number, number],
    position: [2, 0, 0] as [number, number, number],
    speed: { skillName: "Accelerate", skillValue: 0, attempts: { primary: [5, 7] }, result: 12 },
    finalSpeed: 12,
  },
  attack: {
    weapon: "ThrowingDagger",
    hit: { skillName: "Accuracy", skillValue: 0, attempts: { primary: [6, 8] }, result: 14 },
    damage: { skillName: "Push", skillValue: 0, attempts: { primary: [4] }, result: 4 },
    relativeVelocity: 0,
  },
};

describe("QueuePanel", () => {
  it("abre uma ação fora de ordem pelo actionId", () => {
    const onPull = vi.fn();
    render(
      <QueuePanel
        nameOf={nameOf}
        order={[]}
        gridKind="square"
        queue={[
          { actionId: "a1", actorId: "c1", bars: ["action"] },
          { actionId: "a2", actorId: "n1", bars: ["move"] },
        ]}
        onPull={onPull}
      />,
    );
    const rows = screen.getAllByTestId("queue-row");
    expect(rows[0]).toHaveTextContent("Gon");
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir agora" })[1]);
    expect(onPull).toHaveBeenCalledWith("a2");
  });

  it("fila vazia diz o que vai aparecer ali", () => {
    render(<QueuePanel nameOf={nameOf} queue={[]} order={[]} gridKind="square" onPull={() => {}} />);
    expect(screen.getByText(/Ninguém declarou nada ainda/)).toBeInTheDocument();
  });

  it("sem `action` (servidor antigo), a linha não ganha botão Detalhes", () => {
    render(
      <QueuePanel
        nameOf={nameOf}
        order={[]}
        gridKind="square"
        queue={[{ actionId: "a1", actorId: "c1", bars: ["action"] }]}
        onPull={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Detalhes" })).not.toBeInTheDocument();
  });

  // Fix round 1: `aria-expanded` mora no BOTÃO "Detalhes", não na `<li>` — `role="listitem"`
  // não aceita esse atributo (Important 1 da revisão). `aria-controls` liga o botão ao bloco
  // expandido pelo id.
  it("com `action`: Detalhes expande e mostra arma, destino e o total da velocidade", () => {
    render(
      <QueuePanel
        nameOf={nameOf}
        gridKind="square"
        order={[{ actorId: "n1", bars: ["move"], key: 9 }]}
        queue={[{ actionId: "a2", actorId: "n1", bars: ["move"], action: fullAction }]}
        onPull={() => {}}
      />,
    );
    const row = screen.getByTestId("queue-row");
    const detailsButton = screen.getByRole("button", { name: "Detalhes" });
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Arma:/)).not.toBeInTheDocument();

    fireEvent.click(detailsButton);

    expect(detailsButton).toHaveAttribute("aria-expanded", "true");
    const detailsId = detailsButton.getAttribute("aria-controls");
    expect(detailsId).toBeTruthy();
    expect(document.getElementById(detailsId!)).toHaveAttribute("aria-label", "Detalhes da ação");
    expect(within(row).getByText(/Arma: Throwing Dagger/)).toBeInTheDocument();
    expect(within(row).getByText(/Movimento: Dash.*coluna 3, linha 1/)).toBeInTheDocument();
    expect(within(row).getByText(/Velocidade de movimento: Accelerate.*= 12/)).toBeInTheDocument();
    expect(within(row).getByText(/Velocidade de ação: Legerity.*= 14/)).toBeInTheDocument();
    expect(within(row).getByText(/Ordem geral: chave 9/)).toBeInTheDocument();
    expect(within(row).getByText(/Alvos: Gon/)).toBeInTheDocument(); // alvo, por nome

    fireEvent.click(detailsButton);
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Arma:/)).not.toBeInTheDocument();
  });
});

// W1: "esquivou" é a palavra familiar de RPG; "evitou" saiu. `avoided` é por QUALQUER meio
// (contrato) — o verbo depende de `reaction.kind`; sem reação, foi o reflexo passivo.
describe("avoidedVerb (W1)", () => {
  it("sem reação ou dodge/closedDodge: esquivou", () => {
    expect(avoidedVerb(undefined)).toBe("esquivou");
    expect(avoidedVerb({ kind: "dodge" })).toBe("esquivou");
    expect(avoidedVerb({ kind: "closedDodge" })).toBe("esquivou");
  });

  it("escape/escapeGuard/closedEscape: fugiu", () => {
    expect(avoidedVerb({ kind: "escape" })).toBe("fugiu");
    expect(avoidedVerb({ kind: "escapeGuard" })).toBe("fugiu");
    expect(avoidedVerb({ kind: "closedEscape" })).toBe("fugiu");
  });

  it("repel: aparou", () => {
    expect(avoidedVerb({ kind: "repel" })).toBe("aparou");
  });

  it("kind desconhecido cai no padrão: esquivou", () => {
    expect(avoidedVerb({ kind: "nothing" })).toBe("esquivou");
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

  it("W1: alvo que evitou mostra o verbo sozinho, sem \"o golpe\"", () => {
    const avoided: ResolutionPayload = {
      turnId: "t1", isSettled: true,
      targets: [{
        targetId: "c2", avoided: true, defended: false, dodgeTotal: 9, defenseTotal: 0,
        rawDamage: 0, defenseApplied: 0, projectedDamage: 0,
        reaction: { kind: "repel", total: 17, reactionId: "r1", margin: 2, difference: 2, stopsAttack: true },
      }],
    };
    render(<ResolutionDetails resolution={avoided} nameOf={resolutionNameOf} />);
    expect(screen.getByText("Hisoka")).toBeInTheDocument();
    expect(screen.getByText(/^aparou ·/)).toBeInTheDocument();
    expect(screen.queryByText(/evitou/)).not.toBeInTheDocument();
  });
});

describe("QueuePanel — ação em andamento", () => {
  it("mostra no topo o card da ação aberta, marcado, com o cálculo anexado", () => {
    render(
      <QueuePanel
        queue={[{ actionId: "a2", actorId: "c3", bars: ["move"] }]}
        open={{ actorId: "c1", bars: ["action"], resolution: res }}
        order={[]}
        gridKind="square"
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
    render(
      <QueuePanel
        queue={[]}
        open={{ actorId: "c1", resolution: null }}
        order={[]}
        gridKind="square"
        nameOf={resolutionNameOf}
        onPull={() => {}}
      />,
    );
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
    // t1 continua aberto para o turn_opened aparecer; sem REST, tudo é ao vivo.
    render(<EventStream rows={historyRows(undefined, events, undefined, "t1")} nameOf={nameOf} gridKind="square" />);
    const rows = screen.getAllByTestId("event-row");
    expect(rows[0]).toHaveTextContent(
      "Turno de Gon — mover para coluna 5, linha 8 (Dash) e atacar Hisoka com Throwing Dagger",
    );
    // W1: sem reação, "esquivou" é o reflexo passivo de esquiva (nunca mais "evitou").
    expect(rows[1]).toHaveTextContent(`Fim do turno de Gon — Hisoka ${MINUS}7, Killua esquivou`);
    expect(rows[2]).toHaveTextContent(`Hisoka: 13/20 (${MINUS}7)`);
    expect(rows[3]).toHaveTextContent("Regime: Disputado");
  });

  it("sem eventos, explica o que vai aparecer", () => {
    render(<EventStream rows={[]} nameOf={nameOf} gridKind="square" />);
    expect(screen.getByText(/Nada aconteceu ainda/)).toBeInTheDocument();
  });

  it("um turno do REST diz ator, alvos, arma, movimento e o desfecho por alvo (F4)", () => {
    const target = (targetId: string, avoided: boolean, projectedDamage: number) => ({
      targetId, avoided, defended: false, dodgeTotal: 0, defenseTotal: 0,
      rawDamage: projectedDamage, defenseApplied: 0, projectedDamage,
    });
    const armed: HistoryTurn = {
      uuid: "t1", createdAt: "2026-01-01T00:01:00Z", finishedAt: "2026-01-01T00:01:00Z",
      action: {
        uuid: "a1", actorId: "c1", reactionKind: "", move: { category: "Dash", from: [1, 1, 0], position: [3, 4, 0] },
        targetId: ["n1", "c2"], attack: { weapon: "ThrowingDagger" },
      },
      resolution: { isSettled: true, targets: [target("n1", false, 7), target("c2", true, 0)] },
      masterActions: [],
    };
    const unarmed: HistoryTurn = {
      uuid: "t2", createdAt: "2026-01-01T00:02:00Z", finishedAt: "2026-01-01T00:02:00Z",
      action: { uuid: "a2", actorId: "c2", reactionKind: "", targetId: ["n1"], attack: {}, move: { category: "Shift" } },
      resolution: { isSettled: true, targets: [target("n1", false, 0)] },
      masterActions: [],
    };
    const bare: HistoryTurn = {
      uuid: "t3", createdAt: "2026-01-01T00:03:00Z",
      action: { uuid: "a3", actorId: "n1", reactionKind: "", interact: { kind: "open" } },
      masterActions: [],
    };
    const history: MatchHistory = {
      scenes: [{
        uuid: "s1", category: "battle", briefDesc: "", createdAt: "2026-01-01T00:00:00Z",
        rounds: [{ uuid: "r1", mode: "Race", createdAt: "2026-01-01T00:00:00Z", turns: [armed, unarmed, bare], events: [] }],
      }],
    };
    render(<EventStream rows={historyRows(history, [], 0, undefined)} nameOf={nameOf} gridKind="square" />);
    const rows = screen.getAllByTestId("event-row");
    expect(rows[0]).toHaveTextContent("Cena: batalha");
    // O destino é como ESTE leitor o viu: sem `position`, só a categoria (fog, ou ator sem peça).
    expect(rows[1]).toHaveTextContent(
      `Turno de Gon — moveu para coluna 4, linha 5 (Dash) e atacou Hisoka, Killua com Throwing Dagger · Hisoka ${MINUS}7, Killua esquivou`,
    );
    expect(rows[2]).toHaveTextContent("Turno de Killua — moveu (Shift) e atacou Hisoka · Hisoka sem dano");
    expect(rows[3]).toHaveTextContent("Turno de Hisoka — interagiu (open)");
  });

  it("cena, regime, round fechado e master actions do REST, com os textos do ao vivo (F4 parte 2)", () => {
    const ma = (uuid: string, at: string, rest: Pick<HistoryMasterAction, "kind" | "content">): HistoryMasterAction =>
      ({ uuid, happenedAt: at, ...rest }) as HistoryMasterAction;
    const inTurn = ma("ma0", "2026-01-01T00:01:10Z", { kind: "wallInteract", content: { wallIds: ["w1"], interact: "open" } });
    const turnWithMaster: HistoryTurn = {
      uuid: "t1", createdAt: "2026-01-01T00:01:00Z", finishedAt: "2026-01-01T00:01:30Z",
      action: { uuid: "a1", actorId: "c1", reactionKind: "" },
      masterActions: [{ ...inTurn, turnId: "t1" }],
    };
    const event = (m: HistoryMasterAction) => ({ uuid: m.uuid, kind: "masterAction" as const, createdAt: m.happenedAt, masterAction: m });
    const history: MatchHistory = {
      scenes: [
        {
          uuid: "s1", category: "roleplay", briefDesc: "Taverna", createdAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:09:00Z",
          rounds: [
            {
              uuid: "r1", mode: "Race", createdAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:05:00Z",
              turns: [turnWithMaster],
              events: [
                { uuid: "e1", kind: "roundModeChanged", createdAt: "2026-01-01T00:00:30Z", payload: { from: "Free", to: "Race" } },
                event(ma("ma1", "2026-01-01T00:02:00Z", { kind: "movePiece", content: { characterId: "c1", pieceId: "p1", from: [0, 0, 0], to: [2, 3, 0] } })),
                event(ma("ma2", "2026-01-01T00:02:10Z", { kind: "movePiece", content: { characterId: "c2", pieceId: "p2", from: [0, 0, 0] } })),
                event(ma("ma3", "2026-01-01T00:02:20Z", { kind: "placePiece", content: { characterId: "n1", pieceId: "p3", to: [5, 5, 0] } })),
                event(ma("ma4", "2026-01-01T00:02:30Z", { kind: "removePiece", content: { characterId: "n1", pieceId: "p3", from: [5, 5, 0] } })),
                event(ma("ma5", "2026-01-01T00:02:40Z", { kind: "revealWall", content: { wallIds: ["w2"], interact: "reveal" } })),
                event(ma("ma6", "2026-01-01T00:02:50Z", { kind: "trapSprung", content: {} } as unknown as Pick<HistoryMasterAction, "kind" | "content">)),
              ],
            },
            { uuid: "r2", mode: "Race", createdAt: "2026-01-01T00:05:00Z", finishedAt: "2026-01-01T00:09:00Z", turns: [], events: [] },
          ],
        },
        {
          uuid: "s2", category: "battle", briefDesc: "Arena", createdAt: "2026-01-01T00:09:00Z",
          rounds: [{ uuid: "r3", mode: "Free", createdAt: "2026-01-01T00:09:00Z", turns: [], events: [] }],
        },
      ],
    };
    render(<EventStream rows={historyRows(history, [], 0, undefined)} nameOf={nameOf} gridKind="square" />);
    const texts = screen.getAllByTestId("event-row").map((r) => r.textContent);
    expect(texts).toEqual([
      expect.stringContaining("Cena: Taverna"),
      expect.stringContaining("Regime: Disputado"),
      // A master action de dentro do turno vai junto da linha dele.
      expect.stringMatching(/Turno de Gon.*Mestre: abrir na passagem/),
      expect.stringContaining("Mestre moveu Gon para coluna 3, linha 4"),
      // Este leitor só viu a peça sair: o REST já veio sem o destino.
      expect.stringMatching(/Mestre moveu Killua$/),
      expect.stringContaining("Mestre pôs Hisoka em coluna 6, linha 6"),
      expect.stringContaining("Mestre tirou Hisoka do mapa"),
      expect.stringContaining("Mestre: revelar na passagem"),
      expect.stringContaining("Ação do mestre"),
      expect.stringContaining("Fim do round"),
      expect.stringContaining("Cena: Arena"),
    ]);
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
