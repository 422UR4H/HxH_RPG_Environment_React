// 1:1 com `System_X_System/docs/dev/api/match-history.md`. A resposta já vem
// projetada por leitor — não filtre no cliente.
import type { ResolutionPayload, RoundMode, SceneCategory } from "../features/match/combat/combatMessages";

export type RollCheck = {
  skillName: string;
  skillValue: number;
  attempts: { primary: number[]; secondary?: number[] };
  result: number;
};

/**
 * `actionwire.Move` (match-combat-ws.md `action_queued`; mesmo formato em match-history.md).
 * `category` sempre viaja; o resto é omitido (não `null`) quando o nível/fog corta —
 * `from`/`position` ausentes quando a fog esconde a casa (ou o ator não tinha peça),
 * `speed`/`charge`/`finalSpeed` ausentes em `Declaration`.
 */
export type HistoryMove = {
  category: string;
  from?: [number, number, number];
  position?: [number, number, number];
  speed?: RollCheck;
  charge?: RollCheck;
  finalSpeed?: number;
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
  move?: HistoryMove;
  attack?: { weapon?: string; hit?: RollCheck; damage?: RollCheck; relativeVelocity?: number };
  defense?: unknown;
  dodge?: { rollCheck: RollCheck };
  repel?: unknown;
  interact?: { kind: string };
  feint?: RollCheck;
  trigger?: Record<string, never>;
  /** Só numa reação cobrada; só para mestre e dono (o servidor já projeta). */
  consumedActionIds?: string[];
};

/**
 * O resolution do REST não tem `turnId` — a identidade do turno já é `HistoryTurn.uuid`;
 * `turnId` só existe em `ResolutionPayload` porque o WS não tem outro jeito de amarrar a
 * mensagem ao turno (ver `TurnResolutionResponse` em `get_match_history.go:180-206`).
 */
export type HistoryResolution = Omit<ResolutionPayload, "turnId">;

type Triple = [number, number, number];

/** Peça: `from` ausente num `placePiece`; `to` ausente num `removePiece` — e num arrasto que
 * este leitor só viu a peça sair (a projeção corta o destino). */
export type MasterActionPieceContent = { characterId: string; pieceId: string; from?: Triple; to?: Triple };
/** Parede: só as que de fato mudaram (um `wallInteract` traz sempre uma). */
export type MasterActionWallContent = { wallIds: string[]; interact: string };

type MasterActionBase = {
  uuid: string;
  /** O turno aberto quando foi aplicada; ausente fora de turno. */
  turnId?: string;
  happenedAt: string;
};

/** `turns[].masterActions[]` e `events[].masterAction` — já projetada para quem lê. */
export type HistoryMasterAction = MasterActionBase & (
  | { kind: "movePiece" | "placePiece" | "removePiece"; content: MasterActionPieceContent }
  | { kind: "wallInteract" | "revealWall"; content: MasterActionWallContent }
  /** O payload do `enqueue_master_action` como o mestre o mandou. */
  | { kind: "turnNote"; content: { targetIds?: string[] } & Record<string, unknown> }
);

/** `rounds[].events[]`: o que aconteceu no round sem ser turno, em ordem de tempo. */
export type HistoryRoundEvent =
  | { uuid: string; kind: "roundModeChanged"; createdAt: string; payload: { from: RoundMode; to: RoundMode } }
  | { uuid: string; kind: "masterAction"; createdAt: string; masterAction: HistoryMasterAction };

export type HistoryTurn = {
  uuid: string;
  createdAt: string;
  finishedAt?: string;
  action: HistoryAction;
  reactions?: HistoryAction[];
  resolution?: HistoryResolution;
  /** Sempre lista. As master actions aplicadas com este turno aberto. */
  masterActions: HistoryMasterAction[];
};

export type HistoryRound = {
  uuid: string;
  /** O ÚLTIMO regime do round; por onde passou está em `events`. */
  mode: RoundMode;
  createdAt: string;
  finishedAt?: string;
  turns: HistoryTurn[];
  /** Sempre lista. */
  events: HistoryRoundEvent[];
};

export type HistoryScene = {
  uuid: string;
  category: SceneCategory;
  briefDesc: string;
  createdAt: string;
  finishedAt?: string;
  rounds: HistoryRound[];
};

export type MatchHistory = { scenes: HistoryScene[] };
