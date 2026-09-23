export type Bar = "action" | "move";
export type RoundMode = "Free" | "Race";
export type MoveCategory = "Dash" | "Shift";
export type SceneCategory = "battle" | "roleplay";

export type ScenePayload = {
  sceneId: string;
  category: SceneCategory;
  briefInitialDescription: string;
};

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

export type QueuedAction = { actionId: string; actorId: string; bars: Bar[] };

/** `actionId` liga action_enqueued → action_queued → turn_opened (B1). */
export type TurnOpenedPayload = {
  turnId: string;
  actorId: string;
  actionId: string;
  /** Sempre "" hoje. NÃO ramifique por ele. */
  actionType?: string;
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

/** Só o que a Fase 6 lê. A cadeia de reação inteira é da Fase 7. */
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
  targets?: Array<{
    targetId: string;
    avoided: boolean;
    defended: boolean;
    rawDamage: number;
    projectedDamage: number;
  }>;
  pendingReactions?: PendingReaction[];
};

export type CloseTurnRefusedPayload = {
  turnId: string;
  pendingReactions: PendingReaction[];
};

export type MatchFullStatePayload = {
  scene?: ScenePayload;
  /** "" quando não há round ativo. */
  roundMode: RoundMode | "";
  bars?: BarsPayload;
  /** Ausente em "fechado e nada aberto". NÃO carrega actionId — ver o spec §8 e §15. */
  openTurn?: { turnId: string; actorId: string };
  /** Master-only. */
  resolution?: ResolutionPayload;
  /** Master-only; ausente = fila vazia. */
  queue?: QueuedAction[];
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
    from: [number, number, number];
    position: [number, number, number];
  };
  interact?: { kind: string };
};
