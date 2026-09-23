import { useCallback, useEffect, useRef, useState } from "react";
import type { GridShape, Piece, SlotCoord, WallSegment } from "../types/tacticalMap";
import type { CombatServerMessage, EnqueueActionPayload, RoundMode } from "../features/match/combat/combatMessages";
import { normalizeCombatMessage } from "../features/match/combat/normalizeWire";

export type MatchWsStatus = "connecting" | "connected" | "disconnected";

/**
 * Board the master seeds the game server with on connect. The server has no DB access
 * of its own, so without the pieces it has no line-of-sight origins and every player's
 * fog covers the whole map.
 *
 * This must come from the REST map, never from live WS state: feeding the server's own
 * map_full_state push back into a sync would loop forever.
 */
export type MatchBoardSync = {
  pieces: Piece[];
  walls: WallSegment[];
  grid?: GridShape;
};

function toPiecePayload(p: Piece) {
  const slot = p.coord.slot;
  return {
    pieceId: p.id,
    slot:
      slot.kind === "square"
        ? { kind: "square", col: slot.col, row: slot.row }
        : { kind: "hex", q: slot.q, r: slot.r },
    characterId: p.characterId,
    visible: p.visible,
    z: p.coord.z,
  };
}

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
const IGNORED_LOBBY_TYPES = new Set([
  "room_state", "player_joined", "master_joined", "player_left", "master_left",
  "player_kicked", "chat_message", "match_started",
]);

type WallStateChangedPayload = {
  wallId: string;
  open: boolean;
  locked: boolean;
};

type UseMatchWsOptions = {
  matchUuid: string | undefined;
  token: string;
  isMaster: boolean;
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
  /** Called when a combat message is received from the server. */
  onCombatMessage?: (msg: CombatServerMessage) => void;
  /**
   * Pieces, walls and grid used to seed the game server once connected (master only).
   * Pass `null`/`undefined` while the REST map is still loading — syncing early would
   * seed an empty board and blank out every player's line of sight.
   */
  board?: MatchBoardSync | null;
};

export function useMatchWs({
  matchUuid,
  token,
  isMaster,
  onWallStateChanged,
  onWallHpChanged,
  onMapFullState,
  onVisibilityUpdated,
  onWallRevealed,
  onPieceMoved,
  onPieceRemoved,
  onWsError,
  onCombatMessage,
  board,
}: UseMatchWsOptions) {
  const [status, setStatus] = useState<MatchWsStatus>("disconnected");
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
  const lastSentTypeRef = useRef<string | undefined>(undefined);
  const boardRef = useRef(board);
  boardRef.current = board;
  const isMasterRef = useRef(isMaster);
  isMasterRef.current = isMaster;

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

  // Seed the server's in-memory board. Pieces are included because the game server
  // resolves each player's line of sight from the positions of the pieces it knows —
  // omitting them leaves every player fully fogged.
  const sendBoardSync = useCallback(() => {
    if (!isMasterRef.current) return;
    const b = boardRef.current;
    if (!b) return; // map not loaded yet; the effect below re-fires once it is
    sendRaw("map_state_sync", {
      pieces: b.pieces.map(toPiecePayload),
      walls: b.walls,
      ...(b.grid ? { grid: b.grid } : {}),
    });
  }, [sendRaw]);

  useEffect(() => {
    if (!matchUuid) return;

    let active = true;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!active) return;
      const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => {
        if (!active) { ws.close(); return; }
        attempts = 0;
        setStatus("connected");
        // The board sync is driven by the effect below, not from here: on connect the
        // REST map may still be loading, and seeding an empty board would wipe the
        // server's pieces and blank out every player's fog.
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; payload: unknown };
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
            onCombatMessageRef.current?.(normalizeCombatMessage(msg));
          } else if (IGNORED_LOBBY_TYPES.has(msg.type)) {
            // F5: legitimate on this socket (see IGNORED_LOBBY_TYPES above), just not
            // acted on here — not a warn-worthy "unhandled" type.
          } else if (import.meta.env.DEV) {
            console.warn("[match-ws] unhandled message type:", msg.type);
          }
        } catch (err) {
          if (import.meta.env.DEV) console.warn("[match-ws] malformed message", err);
        }
      };

      ws.onclose = (ev) => {
        if (!active) return;
        wsRef.current = null;
        // 4001 = lobby_not_open: master hasn't created the room yet — retry
        // Normal close (1000/1001) or max retries: give up
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

    connect();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [matchUuid, token]);

  // Seed the board once the socket is up AND the map has arrived, in either order.
  // `board` is derived from the REST map, so its identity changes only when that data
  // changes — this cannot be retriggered by the server's own map_full_state pushes.
  //
  // Batch 2 (Important, checked against F3): `map_state_sync`'s `pieces` field is a
  // non-empty list here (always `board.pieces.map(toPiecePayload)`), and per the
  // contract a non-empty list REPLACES the server's board authoritatively — never
  // merges. `status` cycles connecting→connected on every reconnect (a network blip,
  // the tab regaining focus, …), and this effect re-runs each time `status` changes —
  // so without the guard below, a master's reconnect mid-match would silently teleport
  // every piece the server had since moved via combat (F3's own piece_moved) back to
  // its REST position from page-load time. `boardSyncedRef` makes the sync fire at most
  // once per mount of this hook (i.e. once per page load — a real remount, e.g.
  // navigating away and back, is a fresh board seed exactly like today's first
  // connect); a reconnect within the same page load never re-sends it.
  const boardSyncedRef = useRef(false);
  useEffect(() => {
    if (!isMaster || !board || status !== "connected" || boardSyncedRef.current) return;
    sendBoardSync();
    boardSyncedRef.current = true;
  }, [isMaster, board, status, sendBoardSync]);

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
    (payload: {
      targetIds: string[];
      interact?: { kind: string };
      attack?: { weapon?: string };
    }) => {
      return sendRaw("enqueue_master_action", payload);
    },
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

  return {
    status,
    sendAction,
    sendMasterAction,
    sendEnqueueAction,
    sendOpenNextAction,
    sendPullAction,
    sendCloseTurn,
    sendChangeRoundMode,
  };
}
