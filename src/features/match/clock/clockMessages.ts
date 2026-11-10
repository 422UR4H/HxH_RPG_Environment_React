// Formatos do relógio da história no fio (camelCase, tempos ingênuos). Fonte: contrato do
// relógio e internal/app/game/clock.go no backend.

export type LimitReason = "start" | "turn" | "scene" | "roundMode" | "round";
export type PauseReason = "manual" | "roundMode" | "scene" | "masterLeft" | "end" | "restart";
export type ClockChangeKind =
  | "start" | "adjust" | "set" | "play" | "pause" | "round" | "scene" | "end" | "limit";

export type ClockState = {
  /** `null` até o mestre definir a hora inicial. */
  storyAt: string | null;
  running: boolean;
  limitAt: string | null;
  limitReason: LimitReason | "";
  /** Contador monotônico do servidor: o cliente descarta o que chega com seq menor. */
  seq: number;
};

export type ClockChange = {
  kind: ClockChangeKind;
  from?: string;
  to?: string;
  deltaSeconds?: number;
  reason?: PauseReason;
  /** Tempo real que durou o play, vindo do servidor (só no `pause`). */
  elapsedSeconds?: number;
};

export type ClockChangedPayload = { clock: ClockState; change: ClockChange };

export type HiatusEnd = { roundNumber: number; turnId: string; actorId: string; actionKind: string };

export type CombatSummary = {
  sceneId: string;
  countedRounds: number;
  countedSeconds: number;
  activeRoundCounts: boolean;
  minimumStoryAt: string;
  hiatuses: Array<{ before: HiatusEnd; after: HiatusEnd }>;
};

export type MatchEnded = {
  matchId: string;
  /** `null` se a partida acabou sem hora definida. */
  storyAt: string | null;
  /** RFC 3339. */
  gameEndAt: string;
};

export type EndMatchPayload = {
  storyAt: string;
  briefFinalDescription?: string;
  confirmLongSkip?: boolean;
};
