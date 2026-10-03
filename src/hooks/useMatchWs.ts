import { useCallback, useEffect, useRef, useState } from "react";
import type { Piece, SlotCoord, WallSegment } from "../types/tacticalMap";
import type {
  ChangeScenePayload, CombatServerMessage, EditActionPayload, EnqueueActionPayload, MasterActionPayload, RoundMode,
} from "../features/match/combat/combatMessages";
import { normalizeCombatMessage } from "../features/match/combat/normalizeWire";

/**
 * `waiting`: the room is not open (`lobby_not_open`) — only the master's connection
 * creates it, so a player who arrives first waits for them instead of giving up.
 */
export type MatchWsStatus = "connecting" | "connected" | "waiting" | "disconnected";

/**
 * A piece exactly as the game server serializes it: flat (`pieceId`/`slot` as
 * siblings), camelCase. NOT equivalent to the frontend's own `Piece` type, which
 * nests `slot` under `coord` — this is a genuinely distinct wire shape, not just a
 * naming difference.
 */
type WirePiece = {
  pieceId: string;
  slot: SlotCoord;
  characterId?: string;
  visible?: boolean;
  z?: number;
};

/**
 * Wire → domain. The server's piece shape is NOT the frontend's: it is flat
 * (`pieceId`/`slot`) while `Piece` nests the slot under `coord`. Handing the raw
 * payload to the renderer makes it read `piece.coord.slot` off `undefined` and crash
 * the whole Pixi tree.
 *
 * `z` is omitted by the server when it is 0, so absence means "on the ground".
 */
function fromPiecePayload(w: WirePiece): Piece {
  return {
    id: w.pieceId,
    characterId: w.characterId ?? "",
    coord: { slot: w.slot, z: w.z ?? 0 },
    visible: w.visible ?? true,
  };
}

/**
 * F3 batch 2: validates a piece_moved's raw slot the same way useLobbyWs.ts's parser
 * does — an unrecognized/incomplete kind is dropped (returns undefined) rather than
 * handed through untyped. Unlike fromPiecePayload above, this never defaults missing
 * fields on the REST of the piece (characterId/visible/z) — those are the caller's call.
 */
function parsePieceMovedSlot(
  raw: { kind?: string; col?: number; row?: number; q?: number; r?: number } | undefined,
): SlotCoord | undefined {
  if (!raw) return undefined;
  if (raw.kind === "square" && raw.col != null && raw.row != null) {
    return { kind: "square", col: raw.col, row: raw.row };
  }
  if (raw.kind === "hex" && raw.q != null && raw.r != null) {
    return { kind: "hex", q: raw.q, r: raw.r };
  }
  return undefined;
}

function parsePolys(
  raw: Array<Array<{ x: number; y: number }>>,
): Array<Array<[number, number]>> {
  return (raw ?? []).map((poly) => poly.map((p) => [p.x, p.y] as [number, number]));
}

const MAX_RECONNECTS = 5;
const BASE_DELAY_MS = 1000;
/** Retry cadence while the room is not open yet (the master has not connected). */
const WAITING_RETRY_MS = 5000;
/**
 * The server always answers a register with `room_state`. A socket that opened and stays
 * silent past this is a dead registration (the room closed while it was being joined —
 * `Register` blocks forever on a room whose loop already returned) and is recycled.
 */
const SILENT_SOCKET_MS = 5000;
/** Close code this hook uses to recycle a silent socket. */
const SILENT_CLOSE_CODE = 4000;
/** Close code the server sends right after `lobby_not_open`. */
const LOBBY_NOT_OPEN_CODE = 4001;

const COMBAT_TYPES = new Set([
  "match_full_state", "bars_updated", "action_enqueued", "action_queued",
  "turn_opened", "turn_closed", "resolution_updated", "character_hp_changed",
  "round_closed", "round_mode_changed", "scene_changed", "close_turn_refused",
]);

// F5: the match socket is the same `room.go` connection the lobby uses, so these
// lobby/room broadcasts are legitimate here too (a player reconnecting mid-match still
// gets room_state/player_joined et al) — they're just not acted on by this hook. Listed
// so the DEV warn below stays meaningful for genuinely unknown types. See
// internal/app/game/message.go for the authoritative type list.
// `action_edited` is the master-only ack of `edit_action`: the edit's effect already arrives
// in the `resolution_updated` sent with it, so there is nothing left for it to do here.
const IGNORED_TYPES = new Set([
  "room_state", "player_joined", "master_joined", "player_left", "master_left",
  "player_kicked", "chat_message", "match_started",
  "action_edited",
]);

type WallStateChangedPayload = {
  wallId: string;
  open: boolean;
  locked: boolean;
};

type UseMatchWsOptions = {
  matchUuid: string | undefined;
  token: string;
  /** Called when the server broadcasts a wall open/locked change. */
  onWallStateChanged?: (wallId: string, open: boolean, locked: boolean) => void;
  /** Called when the server broadcasts a wall HP / destroyed change (attack result). */
  onWallHpChanged?: (wallId: string, hp: number, maxHp: number, destroyed: boolean) => void;
  /** Called when the server sends the full fog-of-war state on connect. */
  onMapFullState?: (state: {
    pieces: Piece[];
    walls: WallSegment[];
    visiblePolygons: Array<Array<[number, number]>>;
    fogMode: "live" | "explored";
  }) => void;
  /** Called when visibility polygons change after a move. */
  onVisibilityUpdated?: (
    visiblePolygons: Array<Array<[number, number]>>,
  ) => void;
  /** Called when a secret door is revealed by the master. */
  onWallRevealed?: (wall: WallSegment) => void;
  /**
   * F3: called when the server moves a piece by itself (a turn's Move opening, or a
   * Shift/passed-Dash escape reaction) — fog-gated per recipient, same pair the lobby
   * already relays. Signature matches useLobbyWs's onPieceMoved on purpose: characterId/
   * visible/z are OMITTED (not defaulted) when the server's payload omits them, so the
   * caller can tell "server didn't say" apart from "server said false/0/absent" and patch
   * only what actually changed (the lobby's own handler, LobbyPage.tsx, does the same —
   * see useLiveMapSync.ts's handlePieceMoved for the match version, which additionally
   * updates z/characterId/visible in place when the wire DOES carry them, since elevation
   * is load-bearing in combat).
   */
  onPieceMoved?: (
    pieceId: string,
    slot: SlotCoord,
    characterId?: string,
    visible?: boolean,
    z?: number,
  ) => void;
  /** F3: pairs with onPieceMoved — sent when the moved piece left this viewer's fog. */
  onPieceRemoved?: (pieceId: string) => void;
  /** Server refusal (`error`). Never broadcast: it is always about our own last send. */
  onWsError?: (e: { code: string; message: string; sentType?: string }) => void;
  /**
   * Called when a combat message is received from the server. `serverAt` is the
   * envelope's own `timestamp` (`Date.parse`d), when the server sent one — `undefined`
   * otherwise. Server time, not `Date.now()`, so a client clock skew never leaks in.
   */
  onCombatMessage?: (msg: CombatServerMessage, serverAt?: number) => void;
  /** `npc_added` (s→c, mesa inteira): o WS avisa, quem tem permissão rebusca por REST. */
  onNpcAdded?: (characterId: string) => void;
  /**
   * `master_action_enqueued` (s→c): só avisa — o que o mestre fez volta pelo histórico (REST).
   * Mesa inteira na nota de turno; só o mestre nas ações de peça (o eco carrega a posição).
   */
  onMasterActionEnqueued?: () => void;
};

export function useMatchWs({
  matchUuid,
  token,
  onWallStateChanged,
  onWallHpChanged,
  onMapFullState,
  onVisibilityUpdated,
  onWallRevealed,
  onPieceMoved,
  onPieceRemoved,
  onWsError,
  onCombatMessage,
  onNpcAdded,
  onMasterActionEnqueued,
}: UseMatchWsOptions) {
  const [status, setStatus] = useState<MatchWsStatus>("connecting");
  // Bumped by `reconnect()` — a new value re-runs the connection effect from scratch.
  const [connectNonce, setConnectNonce] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const onWallStateChangedRef = useRef(onWallStateChanged);
  onWallStateChangedRef.current = onWallStateChanged;
  const onWallHpChangedRef = useRef(onWallHpChanged);
  onWallHpChangedRef.current = onWallHpChanged;
  const onMapFullStateRef = useRef(onMapFullState);
  onMapFullStateRef.current = onMapFullState;
  const onVisibilityUpdatedRef = useRef(onVisibilityUpdated);
  onVisibilityUpdatedRef.current = onVisibilityUpdated;
  const onWallRevealedRef = useRef(onWallRevealed);
  onWallRevealedRef.current = onWallRevealed;
  const onPieceMovedRef = useRef(onPieceMoved);
  onPieceMovedRef.current = onPieceMoved;
  const onPieceRemovedRef = useRef(onPieceRemoved);
  onPieceRemovedRef.current = onPieceRemoved;
  const onWsErrorRef = useRef(onWsError);
  onWsErrorRef.current = onWsError;
  const onCombatMessageRef = useRef(onCombatMessage);
  onCombatMessageRef.current = onCombatMessage;
  const onNpcAddedRef = useRef(onNpcAdded);
  onNpcAddedRef.current = onNpcAdded;
  const onMasterActionEnqueuedRef = useRef(onMasterActionEnqueued);
  onMasterActionEnqueuedRef.current = onMasterActionEnqueued;
  const lastSentTypeRef = useRef<string | undefined>(undefined);
  /**
   * Final review, Important 2: retorna `true` só quando o socket estava OPEN de verdade e
   * o `send` foi mesmo feito. Antes disto era `void` — `enqueueAction` (useMatchCombat)
   * despachava ACTION_SENT incondicionalmente, então um Declarar com o socket caído (ou
   * ainda reconectando) nascia um fantasma que nunca ganharia ack nem erro: fantasma órfão
   * (spec §8 só previa "morre no error", não "nunca chegou a ser enviado").
   */
  const sendRaw = useCallback((type: string, payload: unknown = {}): boolean => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      lastSentTypeRef.current = type;
      ws.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!matchUuid) return;

    let active = true;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    // Set by `lobby_not_open`; read by the close that follows it. The server closes with
    // 4001, but a browser that sees the TCP drop first reports 1006 — the message is the
    // reliable signal, the code is not.
    let roomNotOpen = false;

    const clearSilence = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = null;
    };

    const connect = () => {
      if (!active) return;
      const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      roomNotOpen = false;
      setStatus((s) => (s === "waiting" ? s : "connecting"));

      ws.onopen = () => {
        if (!active) { ws.close(); return; }
        // While waiting for the master, an open socket is not news yet: the server
        // upgrades before it can tell `lobby_not_open` — the first real message decides.
        setStatus((s) => (s === "waiting" ? s : "connected"));
        clearSilence();
        silenceTimer = setTimeout(() => {
          if (wsRef.current === ws) ws.close(SILENT_CLOSE_CODE, "silent socket");
        }, SILENT_SOCKET_MS);
      };

      ws.onmessage = (event: MessageEvent) => {
        // Anything at all proves the registration is alive; only then does the
        // connection count as a success for the reconnect budget.
        clearSilence();
        attempts = 0;
        try {
          const msg = JSON.parse(event.data as string) as { type: string; payload: unknown; timestamp?: string };
          if (msg.type === "lobby_not_open") {
            roomNotOpen = true;
            return;
          }
          setStatus("connected");
          // Server time, not `Date.now()`: an envelope without a valid `timestamp`
          // (or none at all) yields `undefined` rather than a client-clock guess.
          const parsedAt = msg.timestamp ? Date.parse(msg.timestamp) : NaN;
          const serverAt = Number.isNaN(parsedAt) ? undefined : parsedAt;
          if (msg.type === "wall_state_changed") {
            const p = msg.payload as WallStateChangedPayload;
            onWallStateChangedRef.current?.(p.wallId, p.open, p.locked);
          } else if (msg.type === "wall_hp_changed") {
            const p = msg.payload as { wallId: string; hp: number; maxHp: number; destroyed: boolean };
            onWallHpChangedRef.current?.(p.wallId, p.hp, p.maxHp, p.destroyed);
          } else if (msg.type === "map_full_state") {
            const p = msg.payload as {
              pieces?: WirePiece[];
              walls?: unknown[];
              visiblePolygons?: Array<Array<{ x: number; y: number }>>;
              fogMode?: string;
            };
            onMapFullStateRef.current?.({
              pieces: (p.pieces ?? []).map(fromPiecePayload),
              walls: (p.walls ?? []) as unknown as WallSegment[],
              visiblePolygons: parsePolys(p.visiblePolygons ?? []),
              fogMode: p.fogMode === "explored" ? "explored" : "live",
            });
          } else if (msg.type === "visibility_updated") {
            const p = msg.payload as {
              visiblePolygons?: Array<Array<{ x: number; y: number }>>;
            };
            onVisibilityUpdatedRef.current?.(parsePolys(p.visiblePolygons ?? []));
          } else if (msg.type === "wall_revealed") {
            const p = msg.payload as { wall: Record<string, unknown> };
            onWallRevealedRef.current?.(p.wall as unknown as WallSegment);
          } else if (msg.type === "piece_moved") {
            // F3 (amended, browser batch 2): parsed the same way useLobbyWs.ts parses its
            // own piece_moved — NOT through fromPiecePayload, which defaults absent
            // characterId/visible/z to "fully known" values ("", true, 0). Those defaults
            // are right for map_full_state (a full snapshot, nothing is ever "omitted")
            // but wrong here: a piece_moved that only reports a new slot for an
            // ALREADY-known piece must not stomp its characterId/visible/z back to
            // defaults — see useLiveMapSync.ts's handlePieceMoved, which merges instead
            // of overwriting. An invalid/missing slot.kind is dropped, matching the lobby.
            const p = msg.payload as {
              pieceId?: string;
              slot?: { kind?: string; col?: number; row?: number; q?: number; r?: number };
              characterId?: string;
              visible?: boolean;
              z?: number;
            };
            const slot = parsePieceMovedSlot(p.slot);
            if (p.pieceId && slot) {
              onPieceMovedRef.current?.(p.pieceId, slot, p.characterId, p.visible, p.z);
            }
          } else if (msg.type === "piece_removed") {
            const p = msg.payload as { pieceId?: string };
            if (p.pieceId) onPieceRemovedRef.current?.(p.pieceId);
          } else if (msg.type === "npc_added") {
            const p = msg.payload as { characterId?: string };
            if (p.characterId) onNpcAddedRef.current?.(p.characterId);
          } else if (msg.type === "master_action_enqueued") {
            onMasterActionEnqueuedRef.current?.();
          } else if (msg.type === "error") {
            const p = msg.payload as { code?: string; message?: string };
            onWsErrorRef.current?.({
              code: p.code ?? "unknown",
              message: p.message ?? "",
              sentType: lastSentTypeRef.current,
            });
          } else if (COMBAT_TYPES.has(msg.type)) {
            // R33: normalize nil-able Go slices/maps (serialized as JSON `null`) into the
            // empty arrays/objects combatMessages.ts's types promise, once, here — before
            // the reducer or any combat component ever sees this message.
            // `{ type, payload }` only (not `msg` itself): the default branch of
            // normalizeCombatMessage returns its argument as-is, so handing it the raw
            // envelope would leak `timestamp` into the message every combat type but the
            // five normalized ones receives — the brief's "the extra field is ignored"
            // only holds for the normalized cases, which rebuild the object from scratch.
            onCombatMessageRef.current?.(
              normalizeCombatMessage({ type: msg.type, payload: msg.payload }),
              serverAt,
            );
          } else if (IGNORED_TYPES.has(msg.type)) {
            // F5: legitimate on this socket (see IGNORED_TYPES above), just not
            // acted on here — not a warn-worthy "unhandled" type.
          } else if (import.meta.env.DEV) {
            console.warn("[match-ws] unhandled message type:", msg.type);
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn("[match-ws] malformed message", err);
        }
      };

      ws.onclose = (ev) => {
        clearSilence();
        if (!active) return;
        if (wsRef.current === ws) wsRef.current = null;
        // The master has not opened the room yet: keep knocking, without spending the
        // reconnect budget — the player is waiting for someone, not fighting a failure.
        if (roomNotOpen || ev.code === LOBBY_NOT_OPEN_CODE) {
          setStatus("waiting");
          retryTimer = setTimeout(connect, WAITING_RETRY_MS);
          return;
        }
        if (ev.code === 1000 || ev.code === 1001 || attempts >= MAX_RECONNECTS) {
          setStatus("disconnected");
          return;
        }
        attempts++;
        const delay = BASE_DELAY_MS * 2 ** (attempts - 1);
        setStatus("connecting");
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose fires after onerror, so reconnect logic lives there
      };
    };

    // Deferred one tick: React StrictMode mounts, unmounts and remounts synchronously, and
    // an immediate connect would open a socket only to drop it half-registered. The server
    // closes a room the instant its last client leaves, so that throwaway socket could take
    // the room down under the real one (which then registers into a dead room and hangs).
    retryTimer = setTimeout(connect, 0);

    return () => {
      active = false;
      clearSilence();
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [matchUuid, token, connectNonce]);

  const reconnect = useCallback(() => setConnectNonce((n) => n + 1), []);

  /** Send a player action (enqueue_action). */
  const sendAction = useCallback(
    (payload: {
      targetId?: string[];
      interact?: { kind: string };
      move?: { from: [number, number, number]; position: [number, number, number]; category: string };
      attack?: { weapon?: string };
    }) => {
      return sendRaw("enqueue_action", payload);
    },
    [sendRaw],
  );

  /** Send a master action (enqueue_master_action). */
  const sendMasterAction = useCallback(
    (payload: MasterActionPayload) => sendRaw("enqueue_master_action", payload),
    [sendRaw],
  );

  const sendEnqueueAction = useCallback(
    (payload: EnqueueActionPayload) => sendRaw("enqueue_action", payload),
    [sendRaw],
  );
  const sendOpenNextAction = useCallback(() => sendRaw("open_next_action", {}), [sendRaw]);
  const sendPullAction = useCallback(
    (actionId: string) => sendRaw("pull_action", { actionId }),
    [sendRaw],
  );
  const sendCloseTurn = useCallback(
    (confirm?: boolean) => sendRaw("close_turn", confirm ? { confirm: true } : {}),
    [sendRaw],
  );
  const sendChangeRoundMode = useCallback(
    (mode: RoundMode) => sendRaw("change_round_mode", { mode }),
    [sendRaw],
  );
  const sendAddNpc = useCallback(
    (characterSheetUuid: string) => sendRaw("add_npc", { characterSheetUuid }),
    [sendRaw],
  );
  const sendChangeScene = useCallback(
    (payload: ChangeScenePayload) => sendRaw("change_scene", payload),
    [sendRaw],
  );
  const sendEditAction = useCallback(
    (payload: EditActionPayload) => sendRaw("edit_action", payload),
    [sendRaw],
  );

  return {
    status,
    reconnect,
    sendAction,
    sendMasterAction,
    sendEnqueueAction,
    sendOpenNextAction,
    sendPullAction,
    sendCloseTurn,
    sendChangeRoundMode,
    sendAddNpc,
    sendChangeScene,
    sendEditAction,
  };
}
