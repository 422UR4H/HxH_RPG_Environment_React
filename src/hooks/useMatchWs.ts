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

  // Batch 3 (Important, amends batch 2's boardSyncedRef): per-CONNECTION state for the
  // board-sync decision, reset on every `ws.onopen` (first connect AND every reconnect —
  // see the reset in `connect()` below). A once-per-MOUNT guard (batch 2) survived a
  // reconnect fine, but not a game-server RESTART: room.go's NewRoom starts with `pieces`
  // empty (no DB of its own), Register sends map_full_state only when `hasPieces`
  // (room.go:257-262), and only the master's own map_state_sync ever refills `r.pieces` —
  // so after a restart the master's reconnect landed in a genuinely empty room, the old
  // guard blocked the re-sync forever, and the board stayed empty for everyone until a
  // manual page reload.
  //
  // connGotMapFullStateRef: true once THIS connection's register sent a map_full_state
  // (room.go:257-262) — i.e. the room already has pieces server-side; batch 2's own
  // protection (never stomp a board the server has moved via combat) still applies.
  const connGotMapFullStateRef = useRef(false);
  // connRegisterDoneRef: true once the "register is finished, decide now" marker
  // (match_full_state) has arrived this connection — see sendBoardSync/maybeSyncBoard's
  // own comment for why this specific message was chosen.
  const connRegisterDoneRef = useRef(false);
  // connBoardSyncSentRef: true once this connection has already sent (or explicitly
  // decided not to send) its board sync — maybeSyncBoard is called from two independent
  // triggers (the marker arriving, and `board` arriving) and must not act twice.
  const connBoardSyncSentRef = useRef(false);

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

  /**
   * Batch 3: decides, per connection, whether THIS connection needs a board sync — called
   * from two triggers (the register-finished marker arriving, and `board` becoming
   * available), either of which may come last.
   *
   * The marker is `match_full_state`. Per the contract (match-combat-ws.md, "Disparado
   * por" under match_full_state): "todo `register` (conexão OU reconexão) enquanto há
   * sessão de partida — logo depois de `room_state` e do `map_full_state` (se houver
   * peças no tabuleiro), e antes do `player_joined`". Two things that guarantee this is
   * both reliable AND correctly ordered for our case:
   * - room.go's register case (room.go:249-270) sends room_state, then map_full_state IF
   *   `hasPieces` (room.go:257-262), then match_full_state IF the session is non-nil
   *   (room.go:267), then broadcastPlayerJoined — all synchronously, in this exact source
   *   order, inside the Room's single-goroutine event loop, so WS frame order preserves
   *   it: if a map_full_state is sent at all, it is ALWAYS received before match_full_state.
   * - "enquanto há sessão de partida" (session != nil) holds for every connection this
   *   hook ever makes: GamePlayerPage/GameMasterPage only mount after match_started, and
   *   handler.go rehydrates the session synchronously (RehydrateSession, called from
   *   ServeHTTP before room.Register) whenever a restart left it nil but the match was
   *   already started in DB — so match_full_state is not a "sometimes" message here.
   *
   * The self-echoed `player_joined`/`master_joined` was considered and rejected:
   * broadcastPlayerJoined explicitly skips the registering client itself
   * (`if c.userUUID != client.userUUID`, room.go:2473) — it never reaches the very
   * connection that needs the marker, so it cannot be used at all, not just "arrives too
   * late".
   *
   * No timer fallback: this marker is reliable for the traffic this hook actually
   * generates (see above), so a timer would only paper over a case this reasoning already
   * covers. The one theoretical gap — a rehydrate failure (handler.go logs and gives up,
   * session stays nil, match_full_state never fires) — is a pre-existing backend failure
   * mode this WS-layer fix cannot repair either way; noted, not silently patched with a
   * timer.
   */
  const maybeSyncBoard = useCallback(() => {
    if (!isMasterRef.current) return;
    if (!connRegisterDoneRef.current) return; // marker not seen yet this connection
    if (connBoardSyncSentRef.current) return; // already decided this connection
    if (connGotMapFullStateRef.current) {
      // The room already has pieces server-side (batch 2's own protection: never stomp
      // a board the server has since moved via combat with a stale REST snapshot).
      connBoardSyncSentRef.current = true;
      return;
    }
    if (!boardRef.current) return; // REST map not loaded yet — retried when it arrives
    sendBoardSync();
    connBoardSyncSentRef.current = true;
  }, [sendBoardSync]);

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
        // Batch 3: fresh per-connection state — this register's own map_full_state/
        // match_full_state haven't arrived yet, and whatever this connection decides
        // about the board sync hasn't happened yet either.
        connGotMapFullStateRef.current = false;
        connRegisterDoneRef.current = false;
        connBoardSyncSentRef.current = false;
        // The board sync itself is driven by maybeSyncBoard (called once the
        // match_full_state marker and/or `board` arrive), not from here: on connect the
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
            // Batch 3: this register sent pieces — mark it so maybeSyncBoard never
            // overwrites them with a stale REST board (batch 2's protection).
            connGotMapFullStateRef.current = true;
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
            if (msg.type === "match_full_state") {
              // Batch 3: the "register finished, decide now" marker — see
              // maybeSyncBoard's own doc comment for why this message and not a timer.
              connRegisterDoneRef.current = true;
              maybeSyncBoard();
            }
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
    // maybeSyncBoard is referenced from onmessage below — genuinely stable (its own
    // deps chain, sendBoardSync → sendRaw, bottoms out at `[]`), listed so
    // exhaustive-deps doesn't flag it; it never actually changes identity, so this
    // never causes an extra reconnect.
  }, [matchUuid, token, maybeSyncBoard]);

  // Batch 3 (amends batch 2): catches `board` arriving AFTER the match_full_state marker
  // (the REST map fetch racing the WS round-trip) — the marker's own call to
  // maybeSyncBoard already covers the more common "marker arrives after board" order.
  // `board`'s identity only changes when the REST data actually changes (see
  // MatchBoardSync's own doc comment) — never re-triggered by the server's own pushes —
  // so this effect firing again is never itself a signal to re-sync; maybeSyncBoard's own
  // per-connection guards (connRegisterDoneRef/connBoardSyncSentRef) decide that.
  useEffect(() => {
    maybeSyncBoard();
  }, [board, maybeSyncBoard]);

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
