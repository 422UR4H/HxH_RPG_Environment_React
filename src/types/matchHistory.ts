// 1:1 com `System_X_System/docs/dev/api/match-history.md`. A resposta já vem
// projetada por leitor — não filtre no cliente.
import type { ResolutionPayload } from "../features/match/combat/combatMessages";

export type RollCheck = {
  skillName: string;
  skillValue: number;
  attempts: { primary: number[]; secondary?: number[] };
  result: number;
};

export type HistoryAction = {
  uuid: string;
  actorId: string;
  targetId?: string[];
  reactionKind: string;
  reactToId?: string;
  systemBias?: number;
  skills?: Array<{ skillName: string; rollCheck: RollCheck }>;
  speed?: { bar: number; rollCheck: RollCheck };
  /** O formato não está documentado em match-history.md até B15 — só a presença é lida. */
  move?: unknown;
  attack?: { weapon?: string; hit?: RollCheck; damage?: RollCheck; relativeVelocity?: number };
  defense?: unknown;
  dodge?: { rollCheck: RollCheck };
  repel?: unknown;
  interact?: { kind: string };
  feint?: RollCheck;
  trigger?: Record<string, never>;
};

/**
 * O resolution do REST não tem `turnId` — a identidade do turno já é `HistoryTurn.uuid`;
 * `turnId` só existe em `ResolutionPayload` porque o WS não tem outro jeito de amarrar a
 * mensagem ao turno (ver `TurnResolutionResponse` em `get_match_history.go:180-206`).
 */
export type HistoryResolution = Omit<ResolutionPayload, "turnId">;

export type HistoryTurn = {
  uuid: string;
  createdAt: string;
  finishedAt?: string;
  action: HistoryAction;
  reactions?: HistoryAction[];
  resolution?: HistoryResolution;
};

export type HistoryRound = {
  uuid: string;
  mode: string;
  createdAt: string;
  finishedAt?: string;
  turns: HistoryTurn[];
};

export type HistoryScene = {
  uuid: string;
  category: string;
  briefDesc: string;
  createdAt: string;
  finishedAt?: string;
  rounds: HistoryRound[];
};

export type MatchHistory = { scenes: HistoryScene[] };
