import type {
  BarsPayload,
  CloseTurnRefusedPayload,
  CombatServerMessage,
  MatchFullStatePayload,
  QueuedAction,
  ResolutionPayload,
} from "./combatMessages";

/**
 * Wire boundary normalizer (R33). Go serializes a nil slice/map as JSON `null`, not `[]`/
 * `{}`, whenever the struct tag lacks `omitempty` — see the field-by-field audit in
 * `docs/dev/match/combate-fase-6.md` (post-PR#67 fix). combatMessages.ts's types say these
 * fields are always arrays/objects; this file is what makes that true, once, before a
 * combat message reaches the reducer. Everything downstream (GeneralBar, OwnBars,
 * combatReducer, …) may keep assuming the TS types at face value.
 *
 * Applied in useMatchWs's COMBAT_TYPES branch, to every message this switch touches —
 * so `bars_updated` AND `match_full_state.bars` (which reuses the same Go struct, see
 * message.go's MatchFullStatePayload.Bars comment) both go through `normalizeBars`.
 */

/** `BarsPayload` as it actually arrives on the wire: nil-able array/map fields as `null`. */
type WireBars = {
  seq: number;
  prices: BarsPayload["prices"] | null;
  characters:
    | Array<
        Omit<BarsPayload["characters"][number], "actionSpeeds" | "moveSpeeds"> & {
          actionSpeeds: number[] | null;
          moveSpeeds: number[] | null;
        }
      >
    | null;
  order: Array<Omit<BarsPayload["order"][number], "bars"> & { bars: string[] | null }> | null;
};

/**
 * bars_updated / match_full_state.bars. Go's BarsUpdatedPayload (message.go ~L420):
 * `Prices map[string]int`, `Characters []CharacterBarsPayload`, `Order []BarSlotPayload` —
 * none has `omitempty`. `CharacterBarsPayload.ActionSpeeds`/`MoveSpeeds` don't either (and
 * `append([]int(nil), speeds...)` in room.go's newBarsUpdatedPayload returns nil for an
 * empty round). `BarSlotPayload.Bars` also lacks `omitempty`, normalized here defensively
 * even though today's only constructor (room.go) always `make`s it non-nil.
 */
export function normalizeBars(raw: WireBars): BarsPayload {
  return {
    seq: raw.seq,
    prices: raw.prices ?? {},
    characters: (raw.characters ?? []).map((c) => ({
      ...c,
      actionSpeeds: c.actionSpeeds ?? [],
      moveSpeeds: c.moveSpeeds ?? [],
    })),
    order: (raw.order ?? []).map((o) => ({ ...o, bars: (o.bars ?? []) as BarsPayload["order"][number]["bars"] })),
  };
}

type WireResolutionAction = Omit<NonNullable<ResolutionPayload["action"]>, "diceRolled"> & {
  diceRolled: number[] | null;
};

type WireResolution = Omit<ResolutionPayload, "targets" | "action"> & {
  targets: ResolutionPayload["targets"] | null;
  action?: WireResolutionAction | null;
};

/**
 * resolution_updated (and match_full_state.resolution, same Go struct). Go's
 * ResolutionUpdatedPayload.Targets ([]CharacterResultPayload, `json:"targets"`) lacks
 * `omitempty`; newResolutionUpdatedPayload always seeds it `[]CharacterResultPayload{}`
 * today, but the tag makes no promise a future call site has to honor — normalized
 * defensively, per R33. Action.DiceRolled ([]int, `json:"diceRolled"`) also lacks
 * `omitempty` and IS reachable nil (res.ActionResult.DiceRolled with no rolls).
 *
 * PendingReactions (`json:"pendingReactions,omitempty"`) is NOT touched here: omitempty
 * means Go omits the key entirely instead of emitting `null`, which is exactly what
 * combatMessages.ts's optional `pendingReactions?:` already expects.
 */
export function normalizeResolution(raw: WireResolution): ResolutionPayload {
  return {
    ...raw,
    targets: raw.targets ?? [],
    action: raw.action ? { ...raw.action, diceRolled: raw.action.diceRolled ?? [] } : undefined,
  };
}

type WireCloseTurnRefused = Omit<CloseTurnRefusedPayload, "pendingReactions"> & {
  pendingReactions: CloseTurnRefusedPayload["pendingReactions"] | null;
};

/**
 * close_turn_refused. Unlike resolution_updated's PendingReactions, this one's Go tag is
 * `json:"pendingReactions"` — NO omitempty — so it is genuinely nil-able JSON `null`, even
 * though room.go's only call site currently gates on `len(result.Refused) > 0` before
 * building it.
 */
export function normalizeCloseTurnRefused(raw: WireCloseTurnRefused): CloseTurnRefusedPayload {
  return { ...raw, pendingReactions: raw.pendingReactions ?? [] };
}

type WireQueuedAction = Omit<QueuedAction, "bars"> & { bars: QueuedAction["bars"] | null };

/**
 * action_queued, and every item of match_full_state.queue (same Go struct,
 * ActionQueuedPayload, reused whole per message.go's comment on MatchFullStatePayload.Queue).
 * `Bars []string` lacks `omitempty`; normalized defensively (both known constructors
 * `make` it non-nil today).
 */
export function normalizeQueuedAction(raw: WireQueuedAction): QueuedAction {
  return { ...raw, bars: raw.bars ?? [] };
}

type WireMatchFullState = Omit<MatchFullStatePayload, "bars" | "resolution" | "queue"> & {
  bars: WireBars;
  resolution?: WireResolution | null;
  queue?: WireQueuedAction[] | null;
};

/**
 * match_full_state. `Queue []ActionQueuedPayload `json:"queue,omitempty"`` already matches
 * combatMessages.ts's optional `queue?:` — never `null`, only absent — so it is passed
 * through unchanged except for mapping each item through `normalizeQueuedAction`.
 */
export function normalizeMatchFullState(raw: WireMatchFullState): MatchFullStatePayload {
  return {
    ...raw,
    bars: normalizeBars(raw.bars),
    resolution: raw.resolution ? normalizeResolution(raw.resolution) : undefined,
    queue: raw.queue ? raw.queue.map(normalizeQueuedAction) : undefined,
  };
}

/**
 * Single entry point: normalizes one raw server message before it reaches
 * `onCombatMessage`/the reducer. Message types with no nil-able slice/map in
 * combatMessages.ts (turn_opened, character_hp_changed, scene_changed, …) pass through
 * unchanged.
 */
export function normalizeCombatMessage(msg: { type: string; payload: unknown }): CombatServerMessage {
  switch (msg.type) {
    case "bars_updated":
      return { type: "bars_updated", payload: normalizeBars(msg.payload as WireBars) };
    case "match_full_state":
      return { type: "match_full_state", payload: normalizeMatchFullState(msg.payload as WireMatchFullState) };
    case "resolution_updated":
      return { type: "resolution_updated", payload: normalizeResolution(msg.payload as WireResolution) };
    case "close_turn_refused":
      return { type: "close_turn_refused", payload: normalizeCloseTurnRefused(msg.payload as WireCloseTurnRefused) };
    case "action_queued":
      return { type: "action_queued", payload: normalizeQueuedAction(msg.payload as WireQueuedAction) };
    default:
      return msg as CombatServerMessage;
  }
}
