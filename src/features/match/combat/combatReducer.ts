import type {
  ActionEnqueuedPayload, BarsPayload, CloseTurnRefusedPayload, HpChangedPayload,
  MatchFullStatePayload, QueuedAction, ResolutionPayload, RoundClosedPayload,
  RoundModeChangedPayload, RoundMode, ScenePayload, TurnClosedPayload, TurnOpenedPayload,
} from "./combatMessages";
import type { WsError } from "./combatErrorMessages";

export type Ghost = {
  actorId: string;
  from: [number, number, number];
  to: [number, number, number];
};

export type TableEvent =
  | { kind: "turn_opened"; at: number; turnId: string; actorId: string }
  | { kind: "turn_closed"; at: number; turnId: string; resolution?: ResolutionPayload }
  | { kind: "round_closed"; at: number; roundMode: RoundMode }
  | { kind: "round_mode_changed"; at: number; mode: RoundMode }
  | { kind: "scene_changed"; at: number; scene: ScenePayload }
  | { kind: "hp_changed"; at: number; characterId: string; hp: number; damage: number };

export type CombatState = {
  scene?: ScenePayload;
  roundMode: RoundMode | "";
  bars: BarsPayload | null;
  openTurn: { turnId: string; actorId: string; actionId?: string } | null;
  queue: QueuedAction[];
  hp: Record<string, { hp: number; maxHp: number }>;
  ghosts: Record<string, Ghost>;
  /** FIFO de localIds ainda sem ack — acks chegam na ordem de envio (R2). */
  pendingSends: string[];
  events: TableEvent[];
  pendingCloseTurn: CloseTurnRefusedPayload | null;
  lastError: WsError | null;
};

export const initialCombatState: CombatState = {
  roundMode: "",
  bars: null,
  openTurn: null,
  queue: [],
  hp: {},
  ghosts: {},
  pendingSends: [],
  events: [],
  pendingCloseTurn: null,
  lastError: null,
};

export type CombatAction =
  | { type: "match_full_state"; payload: MatchFullStatePayload }
  | { type: "bars_updated"; payload: BarsPayload }
  | { type: "action_enqueued"; payload: ActionEnqueuedPayload }
  | { type: "action_queued"; payload: QueuedAction }
  | { type: "turn_opened"; payload: TurnOpenedPayload }
  | { type: "turn_closed"; payload: TurnClosedPayload }
  | { type: "resolution_updated"; payload: ResolutionPayload }
  | { type: "character_hp_changed"; payload: HpChangedPayload }
  | { type: "round_closed"; payload: RoundClosedPayload }
  | { type: "round_mode_changed"; payload: RoundModeChangedPayload }
  | { type: "scene_changed"; payload: ScenePayload }
  | { type: "close_turn_refused"; payload: CloseTurnRefusedPayload }
  | { type: "ACTION_SENT"; payload: { localId: string; ghost?: Ghost } }
  | { type: "WS_ERROR"; payload: WsError }
  | { type: "ERROR_DISMISSED" }
  | { type: "CLOSE_TURN_DIALOG_DISMISSED" };

const MAX_EVENTS = 200;

function push(events: TableEvent[], e: TableEvent): TableEvent[] {
  const next = [...events, e];
  return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
}

/** Só aceita um snapshot de barras mais novo. O contador NUNCA reinicia (contrato). */
function acceptBars(state: CombatState, incoming: BarsPayload | undefined): BarsPayload | null {
  if (!incoming) return state.bars;
  if (state.bars && incoming.seq <= state.bars.seq) return state.bars;
  return incoming;
}

function withoutGhostsOfActor(ghosts: Record<string, Ghost>, actorId: string) {
  return Object.fromEntries(Object.entries(ghosts).filter(([, g]) => g.actorId !== actorId));
}

export function combatReducer(state: CombatState, action: CombatAction): CombatState {
  switch (action.type) {
    case "match_full_state": {
      const p = action.payload;
      const openTurn = p.openTurn ? { ...p.openTurn } : null;
      return {
        ...state,
        scene: p.scene,
        roundMode: p.roundMode,
        bars: acceptBars(state, p.bars),
        openTurn,
        queue: p.queue ?? [],
        // O snapshot não traz actionId (§15 do spec): varre por ator, que é conservador.
        ghosts: openTurn ? withoutGhostsOfActor(state.ghosts, openTurn.actorId) : state.ghosts,
        // Um envio em voo ainda vai ganhar seu ack ou erro; não mexe em pendingSends aqui.
      };
    }

    case "bars_updated":
      return { ...state, bars: acceptBars(state, action.payload) };

    case "ACTION_SENT": {
      const { localId, ghost } = action.payload;
      return {
        ...state,
        pendingSends: [...state.pendingSends, localId],
        ghosts: ghost ? { ...state.ghosts, [localId]: ghost } : state.ghosts,
      };
    }

    case "action_enqueued": {
      // Acks chegam em ordem de envio (FIFO): reindexa sempre o envio mais ANTIGO ainda
      // pendente, nunca "o último fantasma" (R2) — senão um envio sem movimento seguido de
      // um com movimento rouba o fantasma do segundo.
      const [oldest, ...rest] = state.pendingSends;
      if (oldest === undefined) return state;
      const ghost = state.ghosts[oldest];
      if (!ghost) return { ...state, pendingSends: rest };
      const { [oldest]: _gone, ...others } = state.ghosts;
      return {
        ...state,
        pendingSends: rest,
        ghosts: { ...others, [action.payload.actionId]: ghost },
      };
    }

    case "action_queued":
      return { ...state, queue: [...state.queue, action.payload] };

    case "turn_opened": {
      const { [action.payload.actionId]: _gone, ...ghosts } = state.ghosts;
      return {
        ...state,
        openTurn: action.payload,
        ghosts,
        queue: state.queue.filter((q) => q.actionId !== action.payload.actionId),
        events: push(state.events, {
          kind: "turn_opened",
          at: Date.now(),
          turnId: action.payload.turnId,
          actorId: action.payload.actorId,
        }),
      };
    }

    case "turn_closed": {
      const existing = state.events.find(
        (e) => e.kind === "turn_closed" && e.turnId === action.payload.turnId,
      );
      return {
        ...state,
        openTurn: null,
        pendingCloseTurn: null,
        events: existing
          ? state.events
          : push(state.events, {
              kind: "turn_closed",
              at: Date.now(),
              turnId: action.payload.turnId,
            }),
      };
    }

    case "resolution_updated": {
      // Só a resolução LIQUIDADA vira linha de histórico: a de turno aberto é o cálculo
      // provisório do mestre, e ele já a vê no painel dele.
      if (!action.payload.isSettled) return state;
      const idx = state.events.findIndex(
        (e) => e.kind === "turn_closed" && e.turnId === action.payload.turnId,
      );
      if (idx >= 0) {
        const events = [...state.events];
        events[idx] = { ...(events[idx] as Extract<TableEvent, { kind: "turn_closed" }>), resolution: action.payload };
        return { ...state, events };
      }
      // Chegou antes do turn_closed — a ordem entre os dois não é promessa (contrato).
      return {
        ...state,
        events: push(state.events, {
          kind: "turn_closed",
          at: Date.now(),
          turnId: action.payload.turnId,
          resolution: action.payload,
        }),
      };
    }

    case "character_hp_changed": {
      const p = action.payload;
      return {
        ...state,
        hp: { ...state.hp, [p.characterId]: { hp: p.hp, maxHp: p.maxHp } },
        events: push(state.events, {
          kind: "hp_changed",
          at: Date.now(),
          characterId: p.characterId,
          hp: p.hp,
          damage: p.damage,
        }),
      };
    }

    case "round_closed":
      return {
        ...state,
        openTurn: null,
        ghosts: {},
        events: push(state.events, {
          kind: "round_closed",
          at: Date.now(),
          roundMode: action.payload.roundMode,
        }),
      };

    case "round_mode_changed":
      return {
        ...state,
        roundMode: action.payload.mode,
        events: push(state.events, {
          kind: "round_mode_changed",
          at: Date.now(),
          mode: action.payload.mode,
        }),
      };

    case "scene_changed":
      return {
        ...state,
        scene: action.payload,
        ghosts: {},
        queue: [],
        openTurn: null,
        events: push(state.events, {
          kind: "scene_changed",
          at: Date.now(),
          scene: action.payload,
        }),
      };

    case "close_turn_refused":
      return { ...state, pendingCloseTurn: action.payload };

    case "CLOSE_TURN_DIALOG_DISMISSED":
      return { ...state, pendingCloseTurn: null };

    case "WS_ERROR": {
      if (action.payload.sentType === "enqueue_action" && state.pendingSends.length > 0) {
        const [oldest, ...rest] = state.pendingSends;
        const { [oldest]: _gone, ...ghosts } = state.ghosts;
        return { ...state, lastError: action.payload, pendingSends: rest, ghosts };
      }
      return { ...state, lastError: action.payload };
    }

    case "ERROR_DISMISSED":
      return { ...state, lastError: null };

    default:
      return state;
  }
}
