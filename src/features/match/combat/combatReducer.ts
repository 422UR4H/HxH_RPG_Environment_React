import type {
  ActionEnqueuedPayload, BarsPayload, CloseTurnRefusedPayload, HpChangedPayload,
  MatchFullStatePayload, MoveCategory, QueuedAction, ReactionAttachedPayload, ReactionKind,
  ReactionOpenedPayload, ResolutionPayload, RoundClosedPayload,
  RoundModeChangedPayload, RoundMode, ScenePayload, TurnClosedPayload, TurnOpenedPayload,
} from "./combatMessages";
import type { WsError } from "./combatErrorMessages";
import type { HistoryAction, MatchHistory } from "../../../types/matchHistory";
import type { SlotTriple } from "../../tactical-map/utils/coords";

/**
 * Uma ação que ESTE navegador declarou, do envio até o turno dela fechar. É o que só o dono
 * conhece — o servidor nunca projeta a declaração de um jogador para a mesa — e é daqui que
 * saem a lista "suas ações" e o fantasma do movimento pedido.
 *
 * `id` é local (`local-N`) até o `action_enqueued` devolver o `actionId` de verdade; os acks
 * chegam na ordem dos envios, então o mais antigo ainda `sending` é sempre o do ack.
 */
export type DeclaredAction = {
  id: string;
  actorId: string;
  status: "sending" | "queued" | "open";
  turnId?: string;
  move?: { category: MoveCategory; from?: SlotTriple; to: SlotTriple };
  attack?: { targets: string[]; weapon?: string };
  /** Interação com parede (menu de parede), não vem do compositor. */
  interact?: { kind: string; targets: string[] };
  /** Envio do compositor: o ack limpa o rascunho do ator. */
  fromComposer: boolean;
  at: number;
};

/**
 * Uma declarada que o `match_full_state` não conhecia (B12). Ainda não é perda: pode ter
 * aberto E fechado enquanto o cliente estava fora — só o histórico buscado depois desta
 * chegada (`detectedAt`, hora local) decide. Ver `resolveLostCandidates`.
 */
export type LostCandidate = DeclaredAction & { detectedAt: number };

/** Uma declarada que o servidor perdeu de verdade — para o aviso. */
export type LostDeclared = DeclaredAction & { draftRestored: boolean };

/** De onde vem o que o servidor ainda tem de MEU: jogador `ownQueue`, mestre `queue`. */
export type DeclaredSource = "ownQueue" | "queue";

/**
 * Uma reação MINHA no turno aberto (jogador: meus personagens; mestre: meus NPCs). Nasce
 * `sending` no envio, vira `attached` no `reaction_attached` e `opened` quando o mestre dá a
 * palavra. Nada daqui vai para o `localStorage`: o servidor devolve tudo no `match_full_state`.
 */
export type OwnReaction = {
  /** Ausente enquanto `sending` (o id vem no reaction_attached). */
  reactionId?: string;
  actorId: string;
  turnId: string;
  kind: ReactionKind;
  status: "sending" | "attached" | "opened";
  consumedActionIds: string[];
};

export type TableEvent =
  | { kind: "turn_opened"; at: number; receivedAt: number; turnId: string; actorId: string; mine?: DeclaredAction }
  | { kind: "turn_closed"; at: number; receivedAt: number; turnId: string; actorId?: string; resolution?: ResolutionPayload }
  | { kind: "round_closed"; at: number; receivedAt: number; roundMode: RoundMode }
  | { kind: "round_mode_changed"; at: number; receivedAt: number; mode: RoundMode }
  | { kind: "scene_changed"; at: number; receivedAt: number; scene: ScenePayload }
  | { kind: "hp_changed"; at: number; receivedAt: number; characterId: string; hp: number; maxHp: number; damage: number };

export type CombatState = {
  scene?: ScenePayload;
  roundMode: RoundMode | "";
  bars: BarsPayload | null;
  openTurn: { turnId: string; actorId: string; actionId?: string; action?: HistoryAction } | null;
  /** A fila secreta — só chega ao mestre. */
  queue: QueuedAction[];
  hp: Record<string, { hp: number; maxHp: number }>;
  declared: DeclaredAction[];
  /** Saíram de `declared` na reconexão e esperam o histórico para virar perda (ou não). */
  lostCandidates: LostCandidate[];
  /**
   * Declaradas que o servidor perdeu (B12) — só para o aviso e para devolver o rascunho.
   * Nada aqui é reenviado (I7): reenviar rola os dados de novo.
   */
  lostDeclared: LostDeclared[];
  events: TableEvent[];
  pendingCloseTurn: CloseTurnRefusedPayload | null;
  lastError: WsError | null;
  /** Cálculo provisório do turno aberto — master-only, some ao fechar/round_closed/reconexão. */
  openResolution: ResolutionPayload | null;
  /** A linha da fila que o `turn_opened` tirou — a ação em andamento continua na Fila (F7). */
  openQueued: QueuedAction | null;
  /** As reações ABERTAS do turno aberto, na ordem em que o mestre as abriu (já cortadas para mim). */
  openReactions: HistoryAction[];
  /** As MINHAS reações do turno aberto. */
  ownReactions: OwnReaction[];
  /** O turno que acabou de fechar: o `turn_closed` zera `openTurn` antes de o liquidado chegar. */
  closedTurn: { turnId: string; actorId: string; action?: HistoryAction } | null;
  /** O último turno liquidado — para os balões de resultado. Some no próximo turn_opened. */
  lastSettled: { turnId: string; actorId?: string; action?: HistoryAction; resolution: ResolutionPayload } | null;
};

export const initialCombatState: CombatState = {
  roundMode: "",
  bars: null,
  openTurn: null,
  queue: [],
  hp: {},
  declared: [],
  lostCandidates: [],
  lostDeclared: [],
  events: [],
  pendingCloseTurn: null,
  lastError: null,
  openResolution: null,
  openQueued: null,
  openReactions: [],
  ownReactions: [],
  closedTurn: null,
  lastSettled: null,
};

/** Carimbo de chegada: `at` é a hora do SERVIDOR (envelope), `receivedAt` a local. */
type Stamp = { at?: number; receivedAt?: number };

export type CombatAction =
  | ({ type: "match_full_state"; payload: MatchFullStatePayload; declaredSource?: DeclaredSource } & Stamp)
  | ({ type: "bars_updated"; payload: BarsPayload } & Stamp)
  | ({ type: "action_enqueued"; payload: ActionEnqueuedPayload } & Stamp)
  | ({ type: "action_queued"; payload: QueuedAction } & Stamp)
  | ({ type: "turn_opened"; payload: TurnOpenedPayload } & Stamp)
  | ({ type: "turn_closed"; payload: TurnClosedPayload } & Stamp)
  | ({ type: "resolution_updated"; payload: ResolutionPayload } & Stamp)
  | ({ type: "character_hp_changed"; payload: HpChangedPayload } & Stamp)
  | ({ type: "round_closed"; payload: RoundClosedPayload } & Stamp)
  | ({ type: "round_mode_changed"; payload: RoundModeChangedPayload } & Stamp)
  | ({ type: "scene_changed"; payload: ScenePayload } & Stamp)
  | ({ type: "close_turn_refused"; payload: CloseTurnRefusedPayload } & Stamp)
  | ({ type: "reaction_attached"; payload: ReactionAttachedPayload } & Stamp)
  | ({ type: "reaction_opened"; payload: ReactionOpenedPayload } & Stamp)
  | { type: "REACTION_SENT"; payload: { actorId: string; turnId: string; kind: ReactionKind } }
  | { type: "ACTION_SENT"; payload: DeclaredAction }
  | { type: "DECLARED_DISMISSED"; payload: { ids: string[] } }
  | { type: "LOST_CANDIDATES_RESOLVED"; payload: { ran: string[]; lost: string[]; restored: string[] } }
  | { type: "LOST_DECLARED_DISMISSED" }
  | { type: "WS_ERROR"; payload: WsError }
  | { type: "ERROR_DISMISSED" }
  | { type: "CLOSE_TURN_DIALOG_DISMISSED" };

const MAX_EVENTS = 200;

function push(events: TableEvent[], e: TableEvent): TableEvent[] {
  const next = [...events, e];
  return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
}

function stampOf(action: Stamp): { at: number; receivedAt: number } {
  const receivedAt = action.receivedAt ?? Date.now();
  return { at: action.at ?? receivedAt, receivedAt };
}

/** Só aceita um snapshot de barras mais novo. O contador NUNCA reinicia (contrato). */
function acceptBars(state: CombatState, incoming: BarsPayload | undefined): BarsPayload | null {
  if (!incoming) return state.bars;
  if (state.bars && incoming.seq <= state.bars.seq) return state.bars;
  return incoming;
}

function oldestSendingIndex(declared: DeclaredAction[]): number {
  return declared.findIndex((d) => d.status === "sending");
}

/**
 * Regra de reconciliação B12 (contrato, `match_full_state`): uma declarada é conhecida pelo
 * servidor se e só se está na fila (`ownQueue` do jogador; `queue` do mestre) ou é a ação do
 * `openTurn`. `ownQueue` ausente é um servidor anterior a B12 — não há como saber, fica tudo
 * como estava. `queue` ausente é fila vazia (contrato).
 */
function reconcileDeclared(
  declared: DeclaredAction[],
  p: MatchFullStatePayload,
  source: DeclaredSource,
  consumed: Set<string>,
): { declared: DeclaredAction[]; lost: DeclaredAction[] } {
  const pendingIds = source === "queue" ? (p.queue ?? []).map((q) => q.actionId) : p.ownQueue?.map((q) => q.actionId);
  if (!pendingIds) return { declared, lost: [] };
  const pending = new Set(pendingIds);
  const openActionId = p.openTurn?.actionId;
  const kept: DeclaredAction[] = [];
  const lost: DeclaredAction[] = [];
  for (const d of declared) {
    // Consumida por uma reação cobrada: não é perda — sai calada (contrato B12).
    if (d.status === "queued" && consumed.has(d.id)) continue;
    if (d.status !== "queued" || pending.has(d.id)) kept.push(d);
    // Abriu enquanto eu estava fora: o `turn_opened` dela se perdeu, mas ela existe.
    else if (openActionId && d.id === openActionId) kept.push({ ...d, status: "open", turnId: p.openTurn!.turnId });
    else lost.push(d);
  }
  return { declared: kept, lost };
}

export function combatReducer(state: CombatState, action: CombatAction): CombatState {
  switch (action.type) {
    case "match_full_state": {
      const p = action.payload;
      const openTurn = p.openTurn ? { ...p.openTurn } : null;
      // Um registro novo é um socket novo: o ack (ou erro) de um envio feito pelo socket
      // anterior nunca vai chegar por este. E um turno "meu" que estava aberto e não é mais
      // o turno aberto fechou enquanto eu estava fora.
      const survivors = state.declared.filter(
        (d) => d.status === "queued" || (d.status === "open" && d.turnId === openTurn?.turnId),
      );
      const { declared, lost } = reconcileDeclared(
        survivors, p, action.declaredSource ?? "ownQueue",
        new Set((p.ownReactions ?? []).flatMap((r) => r.consumedActionIds)),
      );
      const known = new Set([...state.lostCandidates, ...state.lostDeclared].map((d) => d.id));
      const { receivedAt: detectedAt } = stampOf(action);
      return {
        ...state,
        scene: p.scene,
        roundMode: p.roundMode,
        bars: acceptBars(state, p.bars),
        openTurn,
        queue: p.queue ?? [],
        declared,
        lostCandidates: [
          ...state.lostCandidates,
          ...lost.filter((d) => !known.has(d.id)).map((d) => ({ ...d, detectedAt })),
        ],
        openResolution: p.resolution && !p.resolution.isSettled ? p.resolution : null,
        // A linha não volta na reconexão: o card em andamento usa o `openTurn`.
        openQueued: null,
        // As reações são as do servidor: a `sending` local some (o botão volta se não chegou).
        openReactions: p.openTurn?.reactions ?? [],
        ownReactions: (p.ownReactions ?? []).map((r) => ({
          reactionId: r.reactionId,
          actorId: r.actorId,
          turnId: p.openTurn?.turnId ?? "",
          kind: r.reactionKind,
          status: r.opened ? ("opened" as const) : ("attached" as const),
          consumedActionIds: r.consumedActionIds,
        })),
        lastSettled: null,
        closedTurn: null,
        // Um character_hp_changed perdido na queda não volta: o REST rebuscado é a base.
        hp: {},
      };
    }

    case "bars_updated":
      return { ...state, bars: acceptBars(state, action.payload) };

    case "ACTION_SENT":
      return { ...state, declared: [...state.declared, action.payload] };

    case "action_enqueued": {
      const i = oldestSendingIndex(state.declared);
      if (i < 0) return state;
      const declared = [...state.declared];
      declared[i] = { ...declared[i], id: action.payload.actionId, status: "queued" };
      return { ...state, declared };
    }

    case "DECLARED_DISMISSED": {
      const ids = new Set(action.payload.ids);
      return { ...state, declared: state.declared.filter((d) => !ids.has(d.id)) };
    }

    case "LOST_CANDIDATES_RESOLVED": {
      const { ran, lost, restored } = action.payload;
      const decided = new Set([...ran, ...lost]);
      const lostIds = new Set(lost);
      const restoredIds = new Set(restored);
      const confirmed = state.lostCandidates
        .filter((d) => lostIds.has(d.id))
        .map(({ detectedAt: _detectedAt, ...d }) => ({ ...d, draftRestored: restoredIds.has(d.id) }));
      return {
        ...state,
        lostCandidates: state.lostCandidates.filter((d) => !decided.has(d.id)),
        lostDeclared: [...state.lostDeclared, ...confirmed],
      };
    }

    case "LOST_DECLARED_DISMISSED":
      return { ...state, lostDeclared: [] };

    case "action_queued":
      return { ...state, queue: [...state.queue, action.payload] };

    case "turn_opened": {
      const { turnId, actorId, actionId } = action.payload;
      const mine = state.declared.find((d) => d.id === actionId);
      return {
        ...state,
        openTurn: action.payload,
        // BF3: a resolução não liquidada pode ter chegado ANTES deste turn_opened (ordem real
        // do servidor em open_next_action) — só sobrevive se for do turno que está abrindo.
        openResolution: state.openResolution?.turnId === turnId ? state.openResolution : null,
        openQueued: state.queue.find((q) => q.actionId === actionId) ?? null,
        declared: state.declared.map((d) =>
          d.id === actionId ? { ...d, status: "open" as const, turnId } : d,
        ),
        queue: state.queue.filter((q) => q.actionId !== actionId),
        openReactions: [],
        ownReactions: [],
        lastSettled: null,
        closedTurn: null,
        events: push(state.events, { kind: "turn_opened", ...stampOf(action), turnId, actorId, mine }),
      };
    }

    case "turn_closed": {
      const { turnId } = action.payload;
      const actorId = state.openTurn?.turnId === turnId ? state.openTurn.actorId : undefined;
      const existing = state.events.some((e) => e.kind === "turn_closed" && e.turnId === turnId);
      return {
        ...state,
        openTurn: state.openTurn?.turnId === turnId ? null : state.openTurn,
        openResolution: state.openResolution?.turnId === turnId ? null : state.openResolution,
        openQueued: state.openTurn?.turnId === turnId ? null : state.openQueued,
        // O liquidado chega depois e precisa de quem agiu e do que declarou.
        closedTurn: state.openTurn?.turnId === turnId
          ? { turnId, actorId: state.openTurn.actorId, action: state.openTurn.action }
          : state.closedTurn,
        openReactions: [],
        ownReactions: [],
        pendingCloseTurn: null,
        declared: state.declared.filter((d) => d.turnId !== turnId),
        events: existing
          ? state.events.map((e) =>
              e.kind === "turn_closed" && e.turnId === turnId && !e.actorId ? { ...e, actorId } : e,
            )
          : push(state.events, { kind: "turn_closed", ...stampOf(action), turnId, actorId }),
      };
    }

    case "resolution_updated": {
      // A resolução do turno aberto é o cálculo provisório do mestre — guardada à parte até
      // liquidar. Só a LIQUIDADA vira linha de histórico; o histórico conta o que aconteceu.
      if (!action.payload.isSettled) {
        // BF3: no servidor, resolution_updated(isSettled=false) chega ANTES do turn_opened
        // correspondente — quando ainda não há turno aberto, guarda do mesmo jeito; o
        // turn_opened descarta se o turnId não bater com o turno que está abrindo.
        return state.openTurn == null || state.openTurn.turnId === action.payload.turnId
          ? { ...state, openResolution: action.payload }
          : state;
      }
      const turnId = action.payload.turnId;
      const closedTurn = state.closedTurn?.turnId === turnId ? state.closedTurn : undefined;
      const openTurn = state.openTurn?.turnId === turnId ? state.openTurn : undefined;
      const lastSettled = {
        turnId,
        actorId: closedTurn?.actorId ?? openTurn?.actorId,
        action: closedTurn?.action ?? openTurn?.action,
        resolution: action.payload,
      };
      const idx = state.events.findIndex((e) => e.kind === "turn_closed" && e.turnId === turnId);
      if (idx >= 0) {
        const events = [...state.events];
        events[idx] = { ...(events[idx] as Extract<TableEvent, { kind: "turn_closed" }>), resolution: action.payload };
        return { ...state, events, lastSettled };
      }
      // Chegou antes do turn_closed — a ordem entre os dois não é promessa (contrato).
      const actorId = state.openTurn?.turnId === turnId ? state.openTurn.actorId : undefined;
      return {
        ...state,
        lastSettled,
        events: push(state.events, {
          kind: "turn_closed", ...stampOf(action), turnId, actorId, resolution: action.payload,
        }),
      };
    }

    case "character_hp_changed": {
      const p = action.payload;
      return {
        ...state,
        hp: { ...state.hp, [p.characterId]: { hp: p.hp, maxHp: p.maxHp } },
        events: push(state.events, {
          kind: "hp_changed", ...stampOf(action), characterId: p.characterId,
          hp: p.hp, maxHp: p.maxHp, damage: p.damage,
        }),
      };
    }

    // O fim do round e a troca de cena não mexem na fila (`settleBars`/`ChangeScene` no
    // servidor): uma ação declarada que ainda não abriu continua valendo no round seguinte,
    // e o fantasma dela continua no mapa.
    case "round_closed":
      return {
        ...state,
        openTurn: null,
        openResolution: null,
        openQueued: null,
        openReactions: [],
        ownReactions: [],
        events: push(state.events, { kind: "round_closed", ...stampOf(action), roundMode: action.payload.roundMode }),
      };

    case "round_mode_changed":
      return {
        ...state,
        roundMode: action.payload.mode,
        events: push(state.events, { kind: "round_mode_changed", ...stampOf(action), mode: action.payload.mode }),
      };

    case "scene_changed":
      return {
        ...state,
        scene: action.payload,
        openReactions: [],
        ownReactions: [],
        lastSettled: null,
        events: push(state.events, { kind: "scene_changed", ...stampOf(action), scene: action.payload }),
      };

    case "REACTION_SENT":
      return {
        ...state,
        ownReactions: [...state.ownReactions, { ...action.payload, status: "sending", consumedActionIds: [] }],
      };

    case "reaction_attached": {
      const p = action.payload;
      const consumed = new Set(p.consumedActionIds);
      const i = state.ownReactions.findIndex((r) => r.status === "sending" && r.actorId === p.actorId);
      // Sem nenhuma `sending` (o mestre recebendo a reação de um jogador) não cria entrada.
      const ownReactions =
        i < 0
          ? state.ownReactions
          : state.ownReactions.map((r, j) =>
              j === i
                ? { ...r, reactionId: p.reactionId, status: "attached" as const, consumedActionIds: p.consumedActionIds }
                : r,
            );
      return {
        ...state,
        ownReactions,
        // Consumida não é perdida (contrato): sai calada, sem aviso e sem devolver rascunho.
        declared: state.declared.filter((d) => !consumed.has(d.id)),
        queue: state.queue.filter((q) => !consumed.has(q.actionId)),
      };
    }

    case "reaction_opened": {
      const { reactionId, reaction } = action.payload;
      const known = state.openReactions.some((r) => r.uuid === reactionId);
      return {
        ...state,
        openReactions: reaction && !known ? [...state.openReactions, reaction] : state.openReactions,
        ownReactions: state.ownReactions.map((r) =>
          r.reactionId === reactionId ? { ...r, status: "opened" as const } : r,
        ),
      };
    }

    case "close_turn_refused":
      return { ...state, pendingCloseTurn: action.payload };

    case "CLOSE_TURN_DIALOG_DISMISSED":
      return { ...state, pendingCloseTurn: null };

    case "WS_ERROR": {
      // `error` é sempre sobre o último envio deste socket; se foi um enqueue, o envio mais
      // antigo ainda sem ack é o recusado.
      if (action.payload.sentType === "attach_reaction") {
        // Mesma regra do enqueue: o erro é do envio mais antigo ainda sem ack.
        const i = state.ownReactions.findIndex((r) => r.status === "sending");
        return {
          ...state,
          lastError: action.payload,
          ownReactions: i < 0 ? state.ownReactions : state.ownReactions.filter((_, j) => j !== i),
        };
      }
      if (action.payload.sentType === "enqueue_action") {
        const i = oldestSendingIndex(state.declared);
        if (i >= 0) {
          return {
            ...state,
            lastError: action.payload,
            declared: state.declared.filter((_, j) => j !== i),
          };
        }
      }
      return { ...state, lastError: action.payload };
    }

    case "ERROR_DISMISSED":
      return { ...state, lastError: null };

    default:
      return state;
  }
}

/**
 * Decide as candidatas que um histórico cobre: só as detectadas ATÉ o início do fetch
 * (`fetchStartedAt >= detectedAt`) — um histórico anterior ao `match_full_state` não sabe do
 * que fechou durante a queda. A que aparece no histórico (como ação ou reação de um turno)
 * rodou: sai calada. A que não aparece foi perdida. `null` = nada a decidir ainda.
 */
export function resolveLostCandidates(
  candidates: LostCandidate[],
  historyData: { history: MatchHistory; fetchStartedAt: number } | undefined,
): { ran: string[]; lost: string[] } | null {
  if (!historyData) return null;
  const covered = candidates.filter((d) => historyData.fetchStartedAt >= d.detectedAt);
  if (covered.length === 0) return null;
  const inHistory = new Set<string>();
  for (const scene of historyData.history.scenes ?? []) {
    for (const round of scene.rounds) {
      for (const turn of round.turns) {
        inHistory.add(turn.action.uuid);
        turn.reactions?.forEach((r) => {
          inHistory.add(r.uuid);
          // Consumida por uma reação cobrada — rodou, de certa forma; não foi perdida (contrato B12).
          r.consumedActionIds?.forEach((id) => inHistory.add(id));
        });
      }
    }
  }
  return {
    ran: covered.filter((d) => inHistory.has(d.id)).map((d) => d.id),
    lost: covered.filter((d) => !inHistory.has(d.id)).map((d) => d.id),
  };
}

/** Os movimentos pedidos que ainda não aconteceram — o fantasma no mapa. */
export function pendingMoves(declared: DeclaredAction[]): Array<DeclaredAction & { move: NonNullable<DeclaredAction["move"]> }> {
  return declared.filter(
    (d): d is DeclaredAction & { move: NonNullable<DeclaredAction["move"]> } =>
      !!d.move && d.status !== "open",
  );
}
