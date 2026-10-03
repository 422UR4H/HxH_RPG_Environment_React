import type { HistoryAction } from "../../../types/matchHistory";

export type Bar = "action" | "move";
export type RoundMode = "Free" | "Race";
export type MoveCategory = "Dash" | "Shift";
export type SceneCategory = "battle" | "roleplay";

export type ScenePayload = {
  sceneId: string;
  category: SceneCategory;
  briefInitialDescription: string;
};

/** `change_scene` (c→s). `category` minúscula, validada no servidor (contrato). */
export type ChangeScenePayload = { category: SceneCategory; briefInitialDescription: string };

export type BarsPayload = {
  seq: number;
  /** Uma barra que ainda não precificou está AUSENTE do mapa. */
  prices: Partial<Record<Bar, number>>;
  characters: Array<{
    characterId: string;
    actionBalance: number;
    moveBalance: number;
    actionSpeeds: number[];
    moveSpeeds: number[];
  }>;
  /** Ordem projetada, maior `key` primeiro. Não identifica ação nenhuma. */
  order: Array<{ actorId: string; bars: Bar[]; key: number }>;
};

/**
 * `action_queued`/`match_full_state.queue` (contrato, B1). `action` reusa o formato do
 * histórico (`actionwire.Full` — nunca projetado, a superfície já é master-only) e vem
 * SEMPRE presente no wire (`actionwire.Action` não é ponteiro, sem `omitempty`); opcional
 * aqui só para um servidor antigo que ainda não manda o campo.
 */
export type QueuedActionDetail = HistoryAction;

export type QueuedAction = { actionId: string; actorId: string; bars: Bar[]; action?: QueuedActionDetail };

/** `actionId` liga action_enqueued → action_queued → turn_opened (B1). */
export type TurnOpenedPayload = {
  turnId: string;
  actorId: string;
  actionId: string;
  /** Sempre "" hoje. NÃO ramifique por ele. */
  actionType: string;
};

export type TurnClosedPayload = { turnId: string };
export type RoundClosedPayload = { roundMode: RoundMode };
export type RoundModeChangedPayload = { mode: RoundMode };
export type ActionEnqueuedPayload = { actionId: string };
export type HpChangedPayload = {
  characterId: string;
  hp: number;
  maxHp: number;
  damage: number;
};

export type PendingReaction = { reactionId: string; actorId: string; kind: string };

export type ReactionResult = {
  kind: string;
  total: number;
  reactionId: string;
  /** Só num aparo. snake_case: valor de enum do domínio. */
  rung?: "great_success" | "success" | "near_miss" | "failure";
  margin: number;
  difference: number;
  stopsAttack: boolean;
};

export type Payout = {
  amount: number;
  bias: number;
  applies: string;
  source: string;
  againstKind: string;
  againstId: string;
  expiresAt: string;
  /** Texto para humano. Não parseie. */
  reason: string;
};

/** Falta do MOTOR ao calcular — não é erro da operação. Master-only. */
export type ResolutionError = { subject: string; kind: string; detail: string };

/**
 * O veredito de uma fuga (`escape`, `escapeGuard`, `closedEscape`) — ausente fora delas.
 * `escaped` = `movePassed` E `dodgePassed`, os dois contra o acerto do atacante.
 */
export type EscapeVerdict = {
  escaped: boolean;
  movePassed: boolean;
  dodgePassed: boolean;
  /** Falhou e o mestre não escolheu onde a peça cai: no fechamento ela fica onde está. */
  awaitsMaster: boolean;
  /** Onde o mestre pôs a peça (`[col, row, z]`; hex `[q, r, z]`). Só enquanto a fuga falha e há escolha. */
  landing?: [number, number, number];
};

export type ResolutionTarget = {
  targetId: string;
  avoided: boolean;
  defended: boolean;
  dodgeTotal: number;
  defenseTotal: number;
  rawDamage: number;
  defenseApplied: number;
  projectedDamage: number;
  reaction?: ReactionResult;
  payouts?: Payout[];
  escape?: EscapeVerdict;
};

export type ResolutionPayload = {
  turnId: string;
  isSettled: boolean;
  action?: {
    skillName: string;
    skillValue: number;
    diceRolled: number[];
    total: number;
    isCritical: boolean;
    isCriticalFailure: boolean;
    margin?: number;
  };
  targets: ResolutionTarget[];
  pendingReactions?: PendingReaction[];
  errors?: ResolutionError[];
};

export type CloseTurnRefusedPayload = {
  turnId: string;
  pendingReactions: PendingReaction[];
};

/**
 * `match_full_state.ownQueue` (contrato, B12). O espelho de `queue` para quem NÃO é o
 * mestre: a mesma ação ainda pendente, cortada em `actionwire.Declaration` — só o que o
 * dono declarou (arma, alvos, `move.category`/`from`/`position`, nomes de perícia), sem
 * dado, total ou velocidade. O reducer usa só `actionId` para reconciliar `declared`
 * (regra B12); `action` não é consumido ainda — tipado largo de propósito.
 */
export type OwnQueuedAction = { actionId: string; action: unknown };

export type MatchFullStatePayload = {
  scene?: ScenePayload;
  /** "" quando não há round ativo. */
  roundMode: RoundMode | "";
  bars?: BarsPayload;
  /**
   * Ausente em "fechado e nada aberto". `actionId` (B2) é a ação que abriu este turno — é
   * o que permite reconciliar `declared` contra `ownQueue` (B12) quando a ação abriu
   * ENQUANTO o cliente estava fora: ela já não está mais pendente (não aparece em
   * `ownQueue`), mas também não foi perdida.
   */
  openTurn?: { turnId: string; actorId: string; actionId?: string };
  /** Master-only. */
  resolution?: ResolutionPayload;
  /** Master-only; ausente = fila vazia. */
  queue?: QueuedAction[];
  /**
   * B12. Ausente SÓ para o mestre; para todo mundo mais, SEMPRE presente — `[]` quando
   * nada seu está pendente. Ver "regra de reconciliação (B12)" no contrato.
   */
  ownQueue?: OwnQueuedAction[];
};

export type WsErrorPayload = { code: string; message: string };

export type CombatServerMessage =
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
  | { type: "close_turn_refused"; payload: CloseTurnRefusedPayload };

/** O que o cliente monta para `enqueue_action`. Sem perícia: o hit é derivado pelo servidor. */
export type EnqueueActionPayload = {
  actorId: string;
  targetId?: string[];
  attack?: { weapon?: string };
  move?: {
    category: MoveCategory;
    /** Opcional (R14): sem ela o servidor só não liga a checagem de parede. */
    from?: [number, number, number];
    position: [number, number, number];
  };
  interact?: { kind: string };
};

/**
 * `enqueue_master_action`. Sem `attack` (B9): o servidor o recusa sempre — o mestre ataca
 * por um NPC, com `enqueue_action`. Parede: `interact` com os ids das paredes. Peça (B14):
 * `move` ou `remove` com EXATAMENTE um id, o da ficha (não o da peça) — `move` arrasta quem
 * tem peça e põe quem não tem; a tripla é `[col, row, z]` (hex: `[q, r, z]`).
 */
export type MasterActionPayload =
  | { targetIds: string[]; interact: { kind: string } }
  | { targetIds: [string]; move: { position: [number, number, number] } }
  | { targetIds: [string]; remove: Record<string, never> };

/**
 * `edit_action` (c→s, só o mestre). Hoje o front só manda a seção `escapeLanding` (F14): o
 * `actionId` é o da REAÇÃO de fuga, e `position: null` limpa a escolha. As outras seções do
 * contrato (`conditions`, `skills`, `targetIds`) entram quando houver tela para editá-las.
 */
export type EditActionPayload = {
  actionId: string;
  escapeLanding: { position: [number, number, number] | null };
};
