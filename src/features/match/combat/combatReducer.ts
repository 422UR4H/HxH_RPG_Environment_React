import type {
  ActionEnqueuedPayload, BarsPayload, CloseTurnRefusedPayload, HpChangedPayload,
  MatchFullStatePayload, MoveCategory, QueuedAction, ResolutionPayload, RoundClosedPayload,
  RoundModeChangedPayload, RoundMode, ScenePayload, TurnClosedPayload, TurnOpenedPayload,
} from "./combatMessages";
import type { WsError } from "./combatErrorMessages";
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
  openTurn: { turnId: string; actorId: string; actionId?: string } | null;
  /** A fila secreta — só chega ao mestre. */
  queue: QueuedAction[];
  hp: Record<string, { hp: number; maxHp: number }>;
  declared: DeclaredAction[];
  /**
   * Declaradas que o servidor não tinha mais na reconexão (B12) — só para o aviso e para
   * devolver o rascunho. Nada aqui é reenviado (I7): reenviar rola os dados de novo.
   */
  lostDeclared: DeclaredAction[];
  events: TableEvent[];
  pendingCloseTurn: CloseTurnRefusedPayload | null;
  lastError: WsError | null;
  /** Cálculo provisório do turno aberto — master-only, some ao fechar/round_closed/reconexão. */
  openResolution: ResolutionPayload | null;
  /** A linha da fila que o `turn_opened` tirou — a ação em andamento continua na Fila (F7). */
  openQueued: QueuedAction | null;
};

export const initialCombatState: CombatState = {
  roundMode: "",
  bars: null,
  openTurn: null,
  queue: [],
  hp: {},
  declared: [],
  lostDeclared: [],
  events: [],
  pendingCloseTurn: null,
  lastError: null,
  openResolution: null,
  openQueued: null,
};

/** Carimbo de chegada: `at` é a hora do SERVIDOR (envelope), `receivedAt` a local. */
type Stamp = { at?: number; receivedAt?: number };

export type CombatAction =
  | ({ type: "match_full_state"; payload: MatchFullStatePayload } & Stamp)
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
  | { type: "ACTION_SENT"; payload: DeclaredAction }
  | { type: "DECLARED_DISMISSED"; payload: { ids: string[] } }
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
 * servidor se e só se está em `ownQueue` ou é a ação do `openTurn`. Sem `ownQueue` (o mestre,
 * ou um servidor anterior a B12) não há como saber — fica tudo como estava.
 */
function reconcileDeclared(
  declared: DeclaredAction[],
  p: MatchFullStatePayload,
): { declared: DeclaredAction[]; lost: DeclaredAction[] } {
  if (!p.ownQueue) return { declared, lost: [] };
  const pending = new Set(p.ownQueue.map((q) => q.actionId));
  const openActionId = p.openTurn?.actionId;
  const kept: DeclaredAction[] = [];
  const lost: DeclaredAction[] = [];
  for (const d of declared) {
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
      const { declared, lost } = reconcileDeclared(survivors, p);
      const lostIds = new Set(state.lostDeclared.map((d) => d.id));
      return {
        ...state,
        scene: p.scene,
        roundMode: p.roundMode,
        bars: acceptBars(state, p.bars),
        openTurn,
        queue: p.queue ?? [],
        declared,
        lostDeclared: [...state.lostDeclared, ...lost.filter((d) => !lostIds.has(d.id))],
        openResolution: p.resolution && !p.resolution.isSettled ? p.resolution : null,
        // A linha não volta na reconexão: o card em andamento usa o `openTurn`.
        openQueued: null,
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
      const idx = state.events.findIndex((e) => e.kind === "turn_closed" && e.turnId === turnId);
      if (idx >= 0) {
        const events = [...state.events];
        events[idx] = { ...(events[idx] as Extract<TableEvent, { kind: "turn_closed" }>), resolution: action.payload };
        return { ...state, events };
      }
      // Chegou antes do turn_closed — a ordem entre os dois não é promessa (contrato).
      const actorId = state.openTurn?.turnId === turnId ? state.openTurn.actorId : undefined;
      return {
        ...state,
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
        events: push(state.events, { kind: "scene_changed", ...stampOf(action), scene: action.payload }),
      };

    case "close_turn_refused":
      return { ...state, pendingCloseTurn: action.payload };

    case "CLOSE_TURN_DIALOG_DISMISSED":
      return { ...state, pendingCloseTurn: null };

    case "WS_ERROR": {
      // `error` é sempre sobre o último envio deste socket; se foi um enqueue, o envio mais
      // antigo ainda sem ack é o recusado.
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

/** Os movimentos pedidos que ainda não aconteceram — o fantasma no mapa. */
export function pendingMoves(declared: DeclaredAction[]): Array<DeclaredAction & { move: NonNullable<DeclaredAction["move"]> }> {
  return declared.filter(
    (d): d is DeclaredAction & { move: NonNullable<DeclaredAction["move"]> } =>
      !!d.move && d.status !== "open",
  );
}
