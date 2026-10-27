import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import GeneralBar from "../GeneralBar";
import CharacterBarsStrip from "../CharacterBarsStrip";
import { fmt } from "../barsMath";
import OwnBars from "../OwnBars";
import QueuePanel from "../QueuePanel";
import CloseTurnRefusedDialog from "../CloseTurnRefusedDialog";
import EventStream from "../EventStream";
import DeclaredActions from "../DeclaredActions";
import CancelDeclaredDialog from "../CancelDeclaredDialog";
import MatchTopBar from "../MatchTopBar";
import { RoundModeSwitch } from "../MasterControls";
import ResolutionDetails from "../ResolutionDetails";
import { avoidedVerb } from "../combatText";
import type { BarsPayload, ResolutionPayload } from "../combatMessages";
import type { DeclaredAction, TableEvent } from "../combatReducer";
import { historyRows } from "../historyRows";
import type { HistoryAction, HistoryMasterAction, HistoryTurn, MatchHistory } from "../../../../types/matchHistory";

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
    expect(screen.queryByTestId("prices")).toBeNull();
  });

  it("shows Fila vazia when nobody is queued", () => {
    render(<GeneralBar nameOf={nameOf} roundMode="" bars={null} />);
    expect(screen.getByText("Fila vazia")).toBeInTheDocument();
    expect(screen.queryByText("ordem vazia")).toBeNull();
  });

  it("prefixes the names with Fila:", () => {
    render(<GeneralBar bars={raceBars} roundMode="Race" nameOf={nameOf} />);
    expect(screen.getByLabelText("Ordem")).toHaveTextContent(/^Fila:\s*Gon/);
  });

  it("hides the Barras button when nobody has data", () => {
    const empty: BarsPayload = {
      ...raceBars, prices: {},
      characters: [{ characterId: "c1", actionBalance: 0, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] }],
    };
    render(<GeneralBar bars={empty} roundMode="Race" nameOf={nameOf} />);
    expect(screen.queryByRole("button", { name: /Barras/ })).toBeNull();
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

describe("CharacterBarsStrip — linhas sem dado", () => {
  it("lists only characters with speed or balance", () => {
    const mixed: BarsPayload = {
      ...raceBars, prices: {},
      characters: [
        { characterId: "c1", actionBalance: 0, moveBalance: 0, actionSpeeds: [16], moveSpeeds: [] },
        { characterId: "c2", actionBalance: 0, moveBalance: 0, actionSpeeds: [], moveSpeeds: [] },
      ],
    };
    render(<CharacterBarsStrip bars={mixed} roundMode="Free" nameOf={nameOf} />);
    expect(screen.getByText("Gon")).toBeInTheDocument();
    expect(screen.queryByText("Killua")).toBeNull();
  });
});

describe("fmt (barsMath)", () => {
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

  it("mostra as linhas na ordem do servidor, não da chegada; fora da ordem leva a etiqueta", () => {
    render(
      <QueuePanel
        nameOf={nameOf}
        gridKind="square"
        order={[
          { actorId: "n1", bars: ["move"], key: 9 },
          { actorId: "c1", bars: ["action"], key: 5 },
        ]}
        queue={[
          { actionId: "a1", actorId: "c1", bars: ["action"] },
          { actionId: "a2", actorId: "n1", bars: ["move"] },
          { actionId: "a3", actorId: "c2", bars: ["action"] },
        ]}
        onPull={() => {}}
      />,
    );
    const rows = screen.getAllByTestId("queue-row");
    expect(rows[0]).toHaveTextContent("Hisoka");
    expect(rows[1]).toHaveTextContent("Gon");
    expect(rows[2]).toHaveTextContent("Killua");
    expect(within(rows[0]).queryByText("próxima rodada")).not.toBeInTheDocument();
    expect(within(rows[2]).getByText("próxima rodada")).toBeInTheDocument();
  });

  describe("ajustes do mestre na fila", () => {
    const queued = {
      actionId: "a2", actorId: "n1", bars: ["move" as const], action: fullAction, damageSkill: "Push",
      conditions: [{ actionId: "a2", field: "speed" as const, bias: 0, modifier: 3 }],
    };

    it("sem onEditAction não há Ajustar", () => {
      render(<QueuePanel nameOf={nameOf} order={[]} gridKind="square" queue={[queued]} onPull={() => {}} />);
      expect(screen.queryByRole("button", { name: "Ajustar" })).not.toBeInTheDocument();
    });

    it("Ajustar abre as rolagens da ação; editar manda o edit_action com o id dela", () => {
      const onEdit = vi.fn();
      render(
        <QueuePanel nameOf={nameOf} order={[]} gridKind="square" mode="Race" queue={[queued]} onPull={() => {}} onEditAction={onEdit} />,
      );
      expect(screen.getByText(/Ajustada: velocidade de ação \+3/)).toBeInTheDocument();
      const adjust = screen.getByRole("button", { name: "Ajustar" });
      fireEvent.click(adjust);
      expect(adjust).toHaveAttribute("aria-expanded", "true");
      const edits = screen.getByLabelText("Ajustes do mestre");
      for (const label of ["Acerto", "Dano", "Velocidade de ação", "Velocidade de movimento"]) {
        expect(within(edits).getByRole("button", { name: `Editar ${label}` })).toBeInTheDocument();
      }
      fireEvent.click(within(edits).getByRole("button", { name: "Editar Acerto" }));
      fireEvent.click(within(edits).getByRole("button", { name: "Vantagem" }));
      fireEvent.click(within(edits).getByRole("button", { name: "Aplicar" }));
      expect(onEdit).toHaveBeenCalledWith({ actionId: "a2", conditions: [{ field: "hit", bias: 1 }] });
      fireEvent.click(within(edits).getByRole("button", { name: "Grab" }));
      expect(onEdit).toHaveBeenCalledWith({ actionId: "a2", damageSkill: "Grab" });
    });
  });

  it("fila vazia diz o que vai aparecer ali", () => {
    render(<QueuePanel nameOf={nameOf} queue={[]} order={[]} gridKind="square" onPull={() => {}} />);
    expect(screen.getByText(/Ninguém declarou nada ainda/)).toBeInTheDocument();
  });

  // §10: sem "Detalhes" — a declaração da fila fica sempre à vista.
  it("com `action`: mostra arma, destino e o total da velocidade sem clique, e não há botão Detalhes", () => {
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
    expect(screen.queryByRole("button", { name: "Detalhes" })).not.toBeInTheDocument();
    expect(within(row).getByLabelText("Detalhes da ação")).toBeInTheDocument();
    expect(within(row).getByText(/Arma: Throwing Dagger/)).toBeInTheDocument();
    expect(within(row).getByText(/Movimento: Dash.*coluna 3, linha 1/)).toBeInTheDocument();
    expect(within(row).getByText(/Velocidade de movimento: Accelerate.*= 12/)).toBeInTheDocument();
    expect(within(row).getByText(/Velocidade de ação: Legerity.*= 14/)).toBeInTheDocument();
    expect(within(row).getByText(/Ordem geral: chave 9/)).toBeInTheDocument();
    expect(within(row).getByText(/Alvos: Gon/)).toBeInTheDocument(); // alvo, por nome
  });

  // I1 (spec §5 F7): o card "em andamento" mostra a declaração (`openTurn.action`, B2) com o
  // mesmo bloco das linhas da fila — já aberto, sem botão.
  it("card em andamento com `action` mostra a declaração; sem barras, omite a cobrança", () => {
    render(
      <QueuePanel
        nameOf={nameOf}
        gridKind="square"
        order={[]}
        queue={[]}
        open={{ actorId: "n1", action: fullAction, resolution: null }}
        onPull={() => {}}
      />,
    );
    const open = screen.getByTestId("queue-open");
    expect(within(open).getByText(/Arma: Throwing Dagger/)).toBeInTheDocument();
    expect(within(open).getByText(/Alvos: Gon/)).toBeInTheDocument();
    expect(within(open).getByText(/Movimento: Dash.*coluna 3, linha 1/)).toBeInTheDocument();
    expect(within(open).queryByText(/Custo:/)).not.toBeInTheDocument();
    expect(within(open).queryByRole("button", { name: "Detalhes" })).not.toBeInTheDocument();
  });

  it("card em andamento com barras mostra também o que a ação cobra", () => {
    render(
      <QueuePanel
        nameOf={nameOf}
        gridKind="square"
        order={[]}
        queue={[]}
        open={{ actorId: "n1", bars: ["move"], action: fullAction, resolution: null }}
        onPull={() => {}}
      />,
    );
    expect(within(screen.getByTestId("queue-open")).getByText("Custo: barra de movimento")).toBeInTheDocument();
  });
});

// W1: "esquivou" é a palavra familiar de RPG; "evitou" saiu. `avoided` é por QUALQUER meio
// (contrato) — o verbo depende de `reaction.kind`; sem reação, foi o reflexo passivo.
describe("avoidedVerb (W1)", () => {
  it("sem reação ou dodge/closedDodge: esquivou", () => {
    expect(avoidedVerb({})).toBe("esquivou");
    expect(avoidedVerb({ reaction: { kind: "dodge" } })).toBe("esquivou");
    expect(avoidedVerb({ reaction: { kind: "closedDodge" } })).toBe("esquivou");
  });

  it("escape/escapeGuard/closedEscape: fugiu", () => {
    expect(avoidedVerb({ reaction: { kind: "escape" } })).toBe("fugiu");
    expect(avoidedVerb({ reaction: { kind: "escapeGuard" } })).toBe("fugiu");
    expect(avoidedVerb({ reaction: { kind: "closedEscape" } })).toBe("fugiu");
  });

  it("repel: aparou", () => {
    expect(avoidedVerb({ reaction: { kind: "repel" } })).toBe("aparou");
  });

  it("attackStopped: ficou a salvo, e precede o kind", () => {
    expect(avoidedVerb({ attackStopped: true })).toBe("ficou a salvo");
    expect(avoidedVerb({ attackStopped: true, reaction: { kind: "nothing" } })).toBe("ficou a salvo");
    expect(avoidedVerb({ attackStopped: true, reaction: { kind: "dodge" } })).toBe("ficou a salvo");
  });

  it("kind desconhecido cai no padrão: esquivou", () => {
    expect(avoidedVerb({ reaction: { kind: "nothing" } })).toBe("esquivou");
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

  it("sem onOpenReaction, não tem botão nenhum fora de uma fuga que falhou", () => {
    render(<ResolutionDetails resolution={res} nameOf={resolutionNameOf} onChooseFallSlot={() => {}} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  describe("fuga que falhou (F14)", () => {
    const escapeRes = (escape: NonNullable<ResolutionPayload["targets"][number]["escape"]>): ResolutionPayload => ({
      turnId: "t1", isSettled: false,
      targets: [{
        targetId: "c2", avoided: escape.escaped, defended: false, dodgeTotal: 12, defenseTotal: 0,
        rawDamage: 10, defenseApplied: 0, projectedDamage: escape.escaped ? 0 : 10,
        reaction: { kind: "escape", total: 14, reactionId: "r-esc", margin: 0, difference: 0, stopsAttack: false },
        escape,
      }],
    });
    const failing = escapeRes({ escaped: false, movePassed: false, dodgePassed: true, awaitsMaster: true });

    it("destaca o alvo e o botão manda o targetId", () => {
      const onChoose = vi.fn();
      render(<ResolutionDetails resolution={failing} nameOf={resolutionNameOf} onChooseFallSlot={onChoose} />);
      expect(screen.getByText("Escape falhou — posição final a critério do mestre")).toBeInTheDocument();
      expect(screen.getByText(/fica onde está/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Escolher onde cai" }));
      expect(onChoose).toHaveBeenCalledWith("c2");
    });

    it("diz que a escolha já foi feita (marcada no mapa), sem coluna nem linha, e oferece trocar", () => {
      const chosen = escapeRes({ escaped: false, movePassed: false, dodgePassed: true, awaitsMaster: false, landing: [5, 2, 0] });
      render(<ResolutionDetails resolution={chosen} nameOf={resolutionNameOf} onChooseFallSlot={() => {}} />);
      expect(screen.getByText(/já escolheu onde cai — marcado no mapa/i)).toBeInTheDocument();
      expect(screen.queryByText(/coluna/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Trocar onde cai" })).toBeInTheDocument();
      expect(screen.queryByText(/fica onde está/i)).not.toBeInTheDocument();
    });

    it("uma fuga que escapou não pede escolha", () => {
      const escaped = escapeRes({ escaped: true, movePassed: true, dodgePassed: true, awaitsMaster: false });
      render(<ResolutionDetails resolution={escaped} nameOf={resolutionNameOf} onChooseFallSlot={() => {}} />);
      expect(screen.queryByText(/Escape falhou/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("sem onChooseFallSlot, o destaque fica e o botão não", () => {
      render(<ResolutionDetails resolution={failing} nameOf={resolutionNameOf} />);
      expect(screen.getByText(/Escape falhou/)).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("QueuePanel repassa onChooseFallSlot ao cálculo do card em andamento", () => {
      const onChoose = vi.fn();
      render(
        <QueuePanel
          queue={[]}
          open={{ actorId: "c1", resolution: failing }}
          order={[]}
          gridKind="square"
          nameOf={resolutionNameOf}
          onPull={() => {}}
          onChooseFallSlot={onChoose}
        />,
      );
      fireEvent.click(within(screen.getByTestId("queue-open")).getByRole("button", { name: "Escolher onde cai" }));
      expect(onChoose).toHaveBeenCalledWith("c2");
    });
  });

  describe("reações esperando: ordem e chave", () => {
    it("ordena pela chave (maior primeiro), sem velocidade por último, e mostra chave e chegada", () => {
      const res: ResolutionPayload = {
        turnId: "t1", isSettled: false, targets: [],
        pendingReactions: [
          { reactionId: "r1", actorId: "c1", kind: "dodge", arrival: 1 },
          { reactionId: "r2", actorId: "c2", kind: "escape", arrival: 2, speed: 9 },
          { reactionId: "r3", actorId: "c3", kind: "repel", arrival: 3, speed: 14 },
        ],
      };
      render(<ResolutionDetails resolution={res} nameOf={resolutionNameOf} onOpenReaction={vi.fn()} />);
      const rows = screen.getAllByRole("button", { name: "Dar a palavra" }).map((b) => b.parentElement!.textContent);
      expect(rows[0]).toMatch(/1º.*chave 14 · chegou em 3º/);
      expect(rows[1]).toMatch(/2º.*chave 9 · chegou em 2º/);
      expect(rows[2]).toMatch(/3º.*sem velocidade · chegou em 1º/);
    });
  });

  describe("o viés que o sistema aplicou sozinho", () => {
    it("a reação que trocou a ação da fila diz que rola com desvantagem — esperando e aberta", () => {
      const res: ResolutionPayload = {
        turnId: "t1", isSettled: false,
        targets: [{
          targetId: "c2", avoided: false, defended: false, dodgeTotal: 11, defenseTotal: 11,
          rawDamage: 10, defenseApplied: 0, projectedDamage: 10,
          reaction: { kind: "escape", total: 12, reactionId: "r2", margin: 0, difference: 0, stopsAttack: false, systemBias: -1 },
        }],
        pendingReactions: [
          { reactionId: "r3", actorId: "c3", kind: "repel", arrival: 2, speed: 14, systemBias: -1 },
          { reactionId: "r4", actorId: "c4", kind: "dodge", arrival: 3 },
        ],
      };
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={res} nameOf={resolutionNameOf} onOpenReaction={vi.fn()} onEditAction={onEdit} />);
      const rows = screen.getAllByRole("button", { name: "Dar a palavra" }).map((b) => b.parentElement!.textContent);
      expect(rows[0]).toMatch(/desvantagem do sistema — trocou a ação da fila/);
      expect(rows[1]).not.toMatch(/sistema/);
      // Aberta: só o movimento da fuga leva a marca — a esquiva não piora.
      expect(screen.getAllByText("desvantagem do sistema")).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: /Editar Movimento/ }));
      expect(screen.getByRole("note")).toHaveTextContent("O sistema já rola esta com Desvantagem");
      expect(screen.getByRole("note")).toHaveTextContent("Vantagem deixa neutro");
    });
  });

  describe("paredes do turno", () => {
    it("com o turno aberto: quanto cada parede vai perder, e que cai no fechamento", () => {
      const res: ResolutionPayload = {
        turnId: "t1", isSettled: false, targets: [],
        walls: [
          { wallId: "w1", kind: "attack", effectiveDamage: 4, hp: 6, maxHp: 10, destroyed: false, open: false },
          { wallId: "w2", kind: "attack", effectiveDamage: 3, hp: 0, maxHp: 3, destroyed: true, open: false },
          { wallId: "w3", kind: "attack", effectiveDamage: 0, hp: 0, maxHp: 0, destroyed: false, open: false },
          { wallId: "w4", kind: "interact", effectiveDamage: 0, hp: 10, maxHp: 10, destroyed: false, open: false, failure: "locked" },
        ],
      };
      render(<ResolutionDetails resolution={res} nameOf={(id) => id} />);
      const block = screen.getByLabelText("Paredes");
      expect(block).toHaveTextContent("O golpe na parede cai quando o turno fechar.");
      expect(block).toHaveTextContent("w1: vai perder 4 de vida — fica com 6/10");
      expect(block).toHaveTextContent("w2: vai perder 3 de vida — fica destruída");
      expect(block).toHaveTextContent("w3: indestrutível — sem dano");
      expect(block).toHaveTextContent("w4: trancada — não abriu");
    });
  });

  describe("dar a palavra (Fase 7, §4.7)", () => {
    const pending: ResolutionPayload = {
      turnId: "t1", isSettled: false, targets: [],
      pendingReactions: [{ reactionId: "r1", actorId: "c2", kind: "dodge" }],
    };

    it("cada reação esperando tem o botão Dar a palavra, que manda o reactionId", () => {
      const onOpen = vi.fn();
      render(<ResolutionDetails resolution={pending} nameOf={resolutionNameOf} onOpenReaction={onOpen} />);
      expect(screen.getByText(/A ordem em que você abre é sua e muda o resultado/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Dar a palavra" }));
      expect(onOpen).toHaveBeenCalledWith("r1");
    });

    // A resposta do servidor (a reação sai de `pendingReactions`) demora um pouco: um segundo
    // clique nesse meio não manda outro `open_reaction`.
    it("clique duplo em Dar a palavra manda uma vez só; a outra reação segue livre", () => {
      const onOpen = vi.fn();
      const two: ResolutionPayload = {
        ...pending,
        pendingReactions: [
          { reactionId: "r1", actorId: "c2", kind: "dodge" },
          { reactionId: "r2", actorId: "c1", kind: "repel" },
        ],
      };
      render(<ResolutionDetails resolution={two} nameOf={resolutionNameOf} onOpenReaction={onOpen} />);
      const [first, second] = screen.getAllByRole("button", { name: "Dar a palavra" });
      fireEvent.click(first);
      fireEvent.click(first);
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(first).toBeDisabled();
      expect(second).toBeEnabled();
    });

    it("a trava cai quando o cálculo é de outro turno", () => {
      const onOpen = vi.fn();
      const { rerender } = render(
        <ResolutionDetails resolution={pending} nameOf={resolutionNameOf} onOpenReaction={onOpen} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Dar a palavra" }));
      expect(screen.getByRole("button", { name: "Dar a palavra" })).toBeDisabled();
      rerender(
        <ResolutionDetails
          resolution={{ ...pending, turnId: "t2" }}
          nameOf={resolutionNameOf}
         
          onOpenReaction={onOpen}
        />,
      );
      expect(screen.getByRole("button", { name: "Dar a palavra" })).toBeEnabled();
    });

    it("a trava cai quando a reação sai de pendingReactions (e volta destravada)", () => {
      const onOpen = vi.fn();
      const props = { nameOf: resolutionNameOf, gridKind: "square" as const, onOpenReaction: onOpen };
      const { rerender } = render(<ResolutionDetails resolution={pending} {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Dar a palavra" }));
      rerender(<ResolutionDetails resolution={{ ...pending, pendingReactions: [] }} {...props} />);
      rerender(<ResolutionDetails resolution={pending} {...props} />);
      expect(screen.getByRole("button", { name: "Dar a palavra" })).toBeEnabled();
    });

    it("sem onOpenReaction, nenhum botão", () => {
      render(<ResolutionDetails resolution={pending} nameOf={resolutionNameOf} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("mostra a ordem de abertura: a posição entre os alvos com reação", () => {
      const target = (targetId: string, withReaction: boolean): ResolutionPayload["targets"][number] => ({
        targetId, avoided: false, defended: false, dodgeTotal: 10, defenseTotal: 0,
        rawDamage: 5, defenseApplied: 0, projectedDamage: 5,
        ...(withReaction
          ? { reaction: { kind: "dodge", total: 11, reactionId: `r-${targetId}`, margin: 0, difference: 0, stopsAttack: false } }
          : {}),
      });
      const ordered: ResolutionPayload = {
        turnId: "t1", isSettled: false,
        targets: [target("b", true), target("a", true), target("c", false)],
      };
      const names = (id: string) => ({ a: "Alfa", b: "Beta", c: "Gama" }[id] ?? id);
      render(<ResolutionDetails resolution={ordered} nameOf={names} />);
      const card = (name: string) => screen.getByText(name).parentElement as HTMLElement;
      expect(within(card("Beta")).getByText(/aberta em 1º/)).toBeInTheDocument();
      expect(within(card("Alfa")).getByText(/aberta em 2º/)).toBeInTheDocument();
      expect(within(card("Gama")).queryByText(/aberta em/)).not.toBeInTheDocument();
    });

    it("uma reação não aberta diz que não foi aberta, sem ocupar posição na ordem", () => {
      const reaction = (id: string, opened: boolean) => ({
        kind: "dodge", total: 11, reactionId: `r-${id}`, margin: 0, difference: 0, stopsAttack: false, opened,
      });
      const target = (targetId: string, opened: boolean): ResolutionPayload["targets"][number] => ({
        targetId, avoided: false, defended: false, dodgeTotal: 10, defenseTotal: 0,
        rawDamage: 5, defenseApplied: 0, projectedDamage: 5, reaction: reaction(targetId, opened),
      });
      const mixed: ResolutionPayload = { turnId: "t1", isSettled: false, targets: [target("b", true), target("a", false)] };
      const names = (id: string) => ({ a: "Alfa", b: "Beta" }[id] ?? id);
      render(<ResolutionDetails resolution={mixed} nameOf={names} />);
      const card = (name: string) => screen.getByText(name).parentElement as HTMLElement;
      expect(within(card("Beta")).getByText(/aberta em 1º/)).toBeInTheDocument();
      expect(within(card("Alfa")).getByText(/não aberta/)).toBeInTheDocument();
    });

    it("a reação padrão sentada aparece entre as que esperam, marcada como sem resposta", () => {
      const seated: ResolutionPayload = {
        turnId: "t1", isSettled: false, targets: [],
        pendingReactions: [{ reactionId: "r-s", actorId: "c1", kind: "default", seated: true }],
      };
      render(<ResolutionDetails resolution={seated} nameOf={resolutionNameOf} onOpenReaction={() => {}} />);
      expect(screen.getByText(/reação padrão/)).toBeInTheDocument();
      expect(screen.getByText("ainda não respondeu")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Dar a palavra" })).toBeInTheDocument();
    });

    it("QueuePanel repassa onOpenReaction ao cálculo do card em andamento", () => {
      const onOpen = vi.fn();
      render(
        <QueuePanel
          queue={[]}
          open={{ actorId: "c1", resolution: pending }}
          order={[]}
          gridKind="square"
          nameOf={resolutionNameOf}
          onPull={() => {}}
          onOpenReaction={onOpen}
        />,
      );
      fireEvent.click(within(screen.getByTestId("queue-open")).getByRole("button", { name: "Dar a palavra" }));
      expect(onOpen).toHaveBeenCalledWith("r1");
    });
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

  it("alvo depois de um aparo: ficou a salvo (o golpe já tinha parado)", () => {
    const stopped: ResolutionPayload = {
      turnId: "t1", isSettled: true,
      targets: [{
        targetId: "c2", avoided: true, attackStopped: true, defended: false, dodgeTotal: 9, defenseTotal: 0,
        rawDamage: 0, defenseApplied: 0, projectedDamage: 0,
        reaction: { kind: "nothing", total: 0, reactionId: "r1", margin: 0, difference: 0, stopsAttack: false },
      }],
    };
    render(<ResolutionDetails resolution={stopped} nameOf={resolutionNameOf} />);
    expect(screen.getByText(/^ficou a salvo \(o golpe já tinha parado\) ·/)).toBeInTheDocument();
    expect(screen.queryByText(/esquivou/)).not.toBeInTheDocument();
  });

  describe("edição do mestre (Fase 8)", () => {
    const editable: ResolutionPayload = {
      ...res,
      damageSkill: "Push",
      targets: [{ ...res.targets[0], reaction: { ...res.targets[0].reaction!, kind: "dodge", reactionId: "r1" } }],
      conditions: [{ actionId: "act-1", field: "hit", bias: 1, modifier: -2, description: "escuridao" }],
    };

    it("sem onEditAction não há nada de edição", () => {
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} />);
      expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Grab" })).not.toBeInTheDocument();
    });

    it("mostra o resumo em vigor e os botões de cada rolagem editável", () => {
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} onEditAction={() => {}} />);
      expect(screen.getByText("vantagem · −2 · escuridao")).toBeInTheDocument();
      for (const name of ["Editar Acerto", "Editar Dano", "Editar Esquiva de Hisoka", "Editar Defesa padrão de Hisoka"]) {
        expect(screen.getByRole("button", { name })).toBeInTheDocument();
      }
    });

    it("editar o acerto abre o editor e manda o edit_action da ação", () => {
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} onEditAction={onEdit} />);
      fireEvent.click(screen.getByRole("button", { name: "Editar Acerto" }));
      fireEvent.click(screen.getByRole("button", { name: "Desfazer edição" }));
      expect(onEdit).toHaveBeenCalledWith({ conditions: [{ field: "hit" }] });
      expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    });

    it("editar a defesa padrão manda com o id da reação e sem viés", () => {
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} onEditAction={onEdit} />);
      fireEvent.click(screen.getByRole("button", { name: "Editar Defesa padrão de Hisoka" }));
      expect(screen.queryByRole("button", { name: "Vantagem" })).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Modificador"), { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
      expect(onEdit).toHaveBeenCalledWith({ actionId: "r1", conditions: [{ field: "defense", modifier: 3 }] });
    });

    it("Push/Grab manda damageSkill na hora; desmarcar o atual tira a perícia do dano (None)", () => {
      const onEdit = vi.fn();
      render(<ResolutionDetails resolution={editable} nameOf={resolutionNameOf} onEditAction={onEdit} />);
      expect(screen.getByRole("button", { name: "Push" })).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(screen.getByRole("button", { name: "Grab" }));
      expect(onEdit).toHaveBeenLastCalledWith({ damageSkill: "Grab" });
      fireEvent.click(screen.getByRole("button", { name: "Push" }));
      expect(onEdit).toHaveBeenLastCalledWith({ damageSkill: "None" });
    });

    it("sem perícia no dano: nenhum marcado, e o painel diz que é só a arma", () => {
      render(<ResolutionDetails resolution={{ ...editable, damageSkill: "None" }} nameOf={resolutionNameOf} onEditAction={vi.fn()} />);
      expect(screen.getByRole("button", { name: "Push" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Grab" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText("nenhuma — só a arma")).toBeInTheDocument();
    });

    it("sem ataque (sem damageSkill) não há bloco Dano nem acerto editável", () => {
      const noAttack = { ...editable, damageSkill: undefined };
      render(<ResolutionDetails resolution={noAttack} nameOf={resolutionNameOf} onEditAction={() => {}} />);
      expect(screen.queryByRole("button", { name: "Editar Acerto" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Grab" })).not.toBeInTheDocument();
    });

    it("o editor fecha quando a rolagem some do cálculo", () => {
      const { rerender } = render(
        <ResolutionDetails resolution={editable} nameOf={resolutionNameOf} onEditAction={() => {}} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Editar Esquiva de Hisoka" }));
      expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
      rerender(
        <ResolutionDetails
          resolution={{ ...editable, targets: [{ ...editable.targets[0], reaction: undefined }] }}
          nameOf={resolutionNameOf}
         
          onEditAction={() => {}}
        />,
      );
      expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    });

    it("o editor fecha quando o turno muda", () => {
      const { rerender } = render(
        <ResolutionDetails resolution={editable} nameOf={resolutionNameOf} onEditAction={() => {}} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Editar Esquiva de Hisoka" }));
      expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
      rerender(
        <ResolutionDetails resolution={{ ...editable, turnId: "t2" }} nameOf={resolutionNameOf} onEditAction={() => {}} />,
      );
      expect(screen.queryByRole("button", { name: "Aplicar" })).not.toBeInTheDocument();
    });

    it("Reflexo (reação fechada) não mostra total; Esquiva (dodge) mostra", () => {
      const withKind = (kind: "dodge" | "closedDodge") => ({
        ...editable,
        targets: [{ ...editable.targets[0], reaction: { ...editable.targets[0].reaction!, kind } }],
      });
      const { rerender } = render(
        <ResolutionDetails resolution={withKind("closedDodge")} nameOf={resolutionNameOf} onEditAction={() => {}} />,
      );
      expect(screen.getByText("Reflexo")).toBeInTheDocument();
      expect(screen.queryByText(/Reflexo\s+\d/)).not.toBeInTheDocument();
      rerender(
        <ResolutionDetails resolution={withKind("dodge")} nameOf={resolutionNameOf} onEditAction={() => {}} />,
      );
      expect(screen.getByText("Esquiva 12")).toBeInTheDocument();
    });
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
  it("shows Fim da rodada", () => {
    const events = [{ kind: "round_closed", at: 1, receivedAt: 1, roundMode: "Race" }] as unknown as TableEvent[];
    render(<EventStream rows={historyRows(undefined, events, undefined, undefined)} nameOf={nameOf} gridKind="square" />);
    expect(screen.getByTestId("event-row")).toHaveTextContent("Fim da rodada");
  });

  it("mudar só o rodapé (pinKey) prende a rolagem ao fim de novo", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollTo });
    try {
      const rows = historyRows(undefined, [], undefined, undefined);
      const { rerender } = render(<EventStream rows={rows} nameOf={nameOf} gridKind="square" pinKey="a" footer={<p>f1</p>} />);
      const before = scrollTo.mock.calls.length;
      rerender(<EventStream rows={rows} nameOf={nameOf} gridKind="square" pinKey="a:queued" footer={<p>f2</p>} />);
      expect(scrollTo.mock.calls.length).toBe(before + 1);
    } finally {
      delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
    }
  });

  it("histórico que não carregou: avisa por cima das linhas ao vivo", () => {
    const events: TableEvent[] = [{ kind: "round_mode_changed", at: 1, receivedAt: 1, mode: "Free" }];
    render(<EventStream rows={historyRows(undefined, events, undefined, undefined)} nameOf={nameOf} gridKind="square" loadFailed />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico.");
    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
  });

  it("o `footer` aparece depois da última linha do histórico", () => {
    const events: TableEvent[] = [{ kind: "round_mode_changed", at: 1, receivedAt: 1, mode: "Free" }];
    render(
      <EventStream
        rows={historyRows(undefined, events, undefined, undefined)}
        nameOf={nameOf}
        gridKind="square"
        footer={<p>rodapé</p>}
      />,
    );
    const row = screen.getByTestId("event-row");
    expect(row.compareDocumentPosition(screen.getByText("rodapé")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("o `footer` também aparece com o histórico vazio", () => {
    render(<EventStream rows={[]} nameOf={nameOf} gridKind="square" footer={<p>rodapé</p>} />);
    expect(screen.getByText("rodapé")).toBeInTheDocument();
  });

  it("histórico que não carregou e nada ao vivo: só o aviso, sem o \"nada aconteceu\"", () => {
    render(<EventStream rows={[]} nameOf={nameOf} gridKind="square" loadFailed />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o histórico.");
    expect(screen.queryByText(/Nada aconteceu ainda/)).not.toBeInTheDocument();
  });

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

  it("alvo depois de um aparo aparece como ficou a salvo na linha do turno", () => {
    const events: TableEvent[] = [
      {
        kind: "turn_closed", at: 2, receivedAt: 2, turnId: "t1", actorId: "c1",
        resolution: {
          turnId: "t1", isSettled: true,
          targets: [{
            targetId: "c2", avoided: true, attackStopped: true, defended: false, dodgeTotal: 0, defenseTotal: 0,
            rawDamage: 0, defenseApplied: 0, projectedDamage: 0,
            reaction: { kind: "nothing", total: 0, reactionId: "r1", margin: 0, difference: 0, stopsAttack: false },
          }],
        },
      },
    ];
    render(<EventStream rows={historyRows(undefined, events, undefined, undefined)} nameOf={nameOf} gridKind="square" />);
    expect(screen.getByTestId("event-row")).toHaveTextContent("Killua ficou a salvo");
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
    expect(rows[0]).toHaveTextContent("Cena: Batalha");
    // O destino é como ESTE leitor o viu: sem `position`, só a categoria (fog, ou ator sem peça).
    expect(rows[1]).toHaveTextContent(
      `Turno de Gon — moveu para coluna 4, linha 5 (Dash) e atacou Hisoka, Killua com Throwing Dagger · Hisoka ${MINUS}7, Killua esquivou`,
    );
    expect(rows[2]).toHaveTextContent("Turno de Killua — moveu (Shift) e atacou Hisoka · Hisoka sem dano");
    expect(rows[3]).toHaveTextContent("Turno de Hisoka — interagiu (abrir)");
  });

  it("a fuga que falhou mostra onde o mestre a pôs, quando o leitor viu (F14)", () => {
    const fled = (targetId: string, landing?: [number, number, number]) => ({
      targetId, avoided: false, defended: false, dodgeTotal: 0, defenseTotal: 0,
      rawDamage: 8, defenseApplied: 0, projectedDamage: 8,
      reaction: { kind: "escape", total: 9, reactionId: "r1", margin: 0, difference: 0, stopsAttack: false },
      escape: { escaped: false, movePassed: false, dodgePassed: true, awaitsMaster: !landing, ...(landing ? { landing } : {}) },
    });
    const turn: HistoryTurn = {
      uuid: "t1", createdAt: "2026-01-01T00:01:00Z", finishedAt: "2026-01-01T00:01:00Z",
      action: { uuid: "a1", actorId: "n1", reactionKind: "", targetId: ["c1", "c2"], attack: {} },
      resolution: { isSettled: true, targets: [fled("c1", [7, 6, 0]), fled("c2")] },
      masterActions: [],
    };
    const history: MatchHistory = {
      scenes: [{
        uuid: "s1", category: "battle", briefDesc: "", createdAt: "2026-01-01T00:00:00Z",
        rounds: [{ uuid: "r1", mode: "Race", createdAt: "2026-01-01T00:00:00Z", turns: [turn], events: [] }],
      }],
    };
    render(<EventStream rows={historyRows(history, [], 0, undefined)} nameOf={nameOf} gridKind="square" />);
    expect(screen.getAllByTestId("event-row")[1]).toHaveTextContent(
      `Turno de Hisoka — atacou Gon, Killua · Gon ${MINUS}8 (a fuga falhou — caiu onde o mestre escolheu), Killua ${MINUS}8`,
    );
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
      expect.stringMatching(/Turno de Gon.*Mestre: abrir \S+/),
      expect.stringContaining("Mestre moveu Gon para coluna 3, linha 4"),
      // Este leitor só viu a peça sair: o REST já veio sem o destino.
      expect.stringMatching(/Mestre moveu Killua$/),
      expect.stringContaining("Mestre pôs Hisoka em coluna 6, linha 6"),
      expect.stringContaining("Mestre tirou Hisoka do mapa"),
      expect.stringMatching(/Mestre: revelar \S+/),
      expect.stringContaining("Ação do mestre"),
      expect.stringContaining("Fim da rodada"),
      expect.stringContaining("Cena: Arena"),
    ]);
  });
});

describe("DeclaredActions", () => {
  it("lista o que foi declarado com o status; só a linha na fila tem Cancelar", () => {
    const onCancel = vi.fn();
    render(
      <DeclaredActions
        nameOf={nameOf}
        gridKind="square"
        onCancel={onCancel}
        declared={[
          { id: "a1", actorId: "c1", status: "queued", fromComposer: true, at: 0, attack: { targets: ["n1"] } },
          { id: "local-2", actorId: "c1", status: "sending", fromComposer: true, at: 1, move: { category: "Shift", to: [0, 0, 0] } },
          { id: "a3", actorId: "c1", status: "open", fromComposer: true, at: 2, attack: { targets: ["n1"] } },
        ]}
      />,
    );
    const rows = screen.getAllByTestId("declared-row");
    expect(rows[0]).toHaveTextContent("Atacar Hisoka");
    expect(rows[0]).toHaveTextContent("na fila");
    expect(rows[1]).toHaveTextContent("Mover para coluna 1, linha 1 (Shift)");
    expect(rows[1]).toHaveTextContent("enviando…");
    expect(screen.queryByRole("button", { name: "Ocultar da lista" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Cancelar" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledWith("a1");
  });

  it("não ocupa espaço quando não há nada", () => {
    const { container } = render(<DeclaredActions nameOf={nameOf} gridKind="square" declared={[]} onCancel={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CancelDeclaredDialog", () => {
  const pending: DeclaredAction = { id: "a1", actorId: "c1", status: "queued", fromComposer: true, at: 0, attack: { targets: ["n1"] } };
  const base = { nameOf, gridKind: "square" as const, canConfirm: true, onConfirm: () => {}, onKeep: () => {} };

  it("pergunta, descreve a ação e diz o que acontece", () => {
    render(<CancelDeclaredDialog {...base} pending={pending} />);
    expect(screen.getByText("Cancelar esta ação?")).toBeInTheDocument();
    expect(screen.getByText(/Atacar Hisoka/i)).toBeInTheDocument();
    expect(screen.getByText("Ela sai da fila e não acontece.")).toBeInTheDocument();
  });

  it("Manter e Cancelar ação chamam cada um o seu", () => {
    const onKeep = vi.fn();
    const onConfirm = vi.fn();
    render(<CancelDeclaredDialog {...base} pending={pending} onKeep={onKeep} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Manter" }));
    expect(onKeep).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar ação" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("sem conexão não dá para confirmar", () => {
    render(<CancelDeclaredDialog {...base} pending={pending} canConfirm={false} />);
    expect(screen.getByRole("button", { name: "Cancelar ação" })).toBeDisabled();
  });

  it("com showSwapCost avisa da Desvantagem; sem ele, não", () => {
    const aviso = "Até o fim da rodada, o que este personagem fizer de novo rola a velocidade com Desvantagem.";
    const { rerender } = render(<CancelDeclaredDialog {...base} pending={pending} showSwapCost />);
    expect(screen.getByText(aviso)).toBeInTheDocument();
    rerender(<CancelDeclaredDialog {...base} pending={pending} />);
    expect(screen.queryByText(aviso)).not.toBeInTheDocument();
  });

  it("sem pedido não renderiza", () => {
    const { container } = render(<CancelDeclaredDialog {...base} pending={null} />);
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

  it("aberta em outra aba: diz isso e oferece usar aqui (reconectar)", () => {
    const onReconnect = vi.fn();
    render(
      <MatchTopBar roundMode="Free" status="replaced" onReconnect={onReconnect} asideOpen={false} onToggleAside={() => {}} />,
    );
    expect(screen.getByTestId("ws-status")).toHaveAttribute("title", "Aberta em outra aba");
    fireEvent.click(screen.getByRole("button", { name: "Usar aqui" }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it("shows the scene label when there is no description", () => {
    render(
      <MatchTopBar
        scene={{ sceneId: "s1", category: "roleplay", briefInitialDescription: "" }}
        roundMode="" status="connected" asideOpen={false} onToggleAside={() => {}}
      />,
    );
    expect(screen.getByText("Roleplay")).toBeInTheDocument();
    expect(screen.queryByText("Cena sem nome")).toBeNull();
  });

  it("diz que está esperando o mestre quando a sala não abriu", () => {
    render(<MatchTopBar roundMode="" status="waiting" asideOpen={false} onToggleAside={() => {}} />);
    expect(screen.getByTestId("ws-status")).toHaveAttribute("title", "Aguardando o mestre abrir a sala…");
  });

  it("shows 'Acordando o servidor…' with the long notice in the tooltip when waking", () => {
    render(<MatchTopBar roundMode="" status="waking" asideOpen={false} onToggleAside={() => {}} />);
    const status = screen.getByTestId("ws-status");
    expect(status).toHaveTextContent("Acordando o servidor…");
    expect(status).toHaveAttribute("title", "Acordando o servidor da mesa… pode levar até um minuto.");
  });
});

describe("EventStream: ação cancelada", () => {
  const cancelled = (action?: HistoryAction): MatchHistory => ({
    scenes: [{
      uuid: "s1", category: "battle", briefDesc: "", createdAt: "2026-01-01T00:00:00Z",
      rounds: [{
        uuid: "r1", mode: "Race", createdAt: "2026-01-01T00:00:00Z", turns: [],
        events: [{ uuid: "x1", kind: "actionCancelled", createdAt: "2026-01-01T00:01:00Z", actorId: "c1", ...(action && { action }) }],
      }],
    }],
  });
  const lastRow = (h: MatchHistory) => {
    render(<EventStream rows={historyRows(h, [], 0, undefined)} nameOf={nameOf} gridKind="square" />);
    return screen.getAllByTestId("event-row")[1];
  };

  it("com a ação (mestre/dono): 'cancelou: <descrição>'; destino e alvos vêm do wire", () => {
    const row = lastRow(cancelled({
      uuid: "x1", actorId: "c1", reactionKind: "", targetId: ["n1"],
      move: { category: "Dash", position: [4, 7, 0] }, attack: { weapon: "Sword" },
    }));
    expect(row).toHaveTextContent("Gon cancelou: mover para coluna 5, linha 8 (Dash) e atacar Hisoka com Sword");
  });

  it("sem a ação (os outros): só 'cancelou uma ação'", () => {
    expect(lastRow(cancelled())).toHaveTextContent("Gon cancelou uma ação");
  });
});

describe("RoundModeSwitch", () => {
  it("clicar no regime em que o round já está não manda nada", () => {
    // O servidor responderia com round_mode_changed sem gravar: a linha ao vivo piscaria e sumiria.
    const onChange = vi.fn();
    render(<RoundModeSwitch mode="Race" onChange={onChange} placement="panel" />);
    fireEvent.click(screen.getByRole("radio", { name: "Disputado" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Livre" }));
    expect(onChange).toHaveBeenCalledWith("Free");
  });
});
