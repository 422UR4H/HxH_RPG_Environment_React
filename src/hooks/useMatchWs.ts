import { useCallback, useEffect, useRef, useState } from "react";
import type { GridShape, Piece, SlotCoord, WallSegment } from "../types/tacticalMap";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";

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
    piece_id: p.id,
    slot:
      slot.kind === "square"
        ? { kind: "square", col: slot.col, row: slot.row }
        : { kind: "hex", q: slot.q, r: slot.r },
    character_id: p.characterId,
    visible: p.visible,
  };
}

/** A piece exactly as the game server serializes it (flat, snake_case, no elevation). */
type WirePiece = {
  piece_id: string;
  slot: SlotCoord;
  character_id?: string;
  visible?: boolean;
};

/**
 * Wire → domain. The server's piece shape is NOT the frontend's: it is flat
 * (`piece_id`/`slot`) while `Piece` nests the slot under `coord`. Handing the raw
 * payload to the renderer makes it read `piece.coord.slot` off `undefined` and crash
 * the whole Pixi tree.
 *
 * `z` is not on the wire; callers that know the map restore it (see GamePage).
 */
function fromPiecePayload(w: WirePiece): Piece {
  return {
    id: w.piece_id,
    characterId: w.character_id ?? "",
    coord: { slot: w.slot, z: 0 },
    visible: w.visible ?? true,
  };
}

function parsePolys(
  raw: Array<Array<{ x: number; y: number }>>,
): Array<Array<[number, number]>> {
  return (raw ?? []).map((poly) => poly.map((p) => [p.x, p.y] as [number, number]));
}

const MAX_RECONNECTS = 5;
const BASE_DELAY_MS = 1000;

type WallStateChangedPayload = {
  wall_id: string;
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
  const boardRef = useRef(board);
  boardRef.current = board;
  const isMasterRef = useRef(isMaster);
  isMasterRef.current = isMaster;

  const sendRaw = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
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
      walls: b.walls.map((w) => objToSnakeCase(w)),
      ...(b.grid ? { grid: objToSnakeCase(b.grid) } : {}),
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
            onWallStateChangedRef.current?.(p.wall_id, p.open, p.locked);
          } else if (msg.type === "wall_hp_changed") {
            const p = msg.payload as { wall_id: string; hp: number; max_hp: number; destroyed: boolean };
            onWallHpChangedRef.current?.(p.wall_id, p.hp, p.max_hp, p.destroyed);
          } else if (msg.type === "map_full_state") {
            const p = msg.payload as {
              pieces?: WirePiece[];
              walls?: unknown[];
              visible_polygons?: Array<Array<{ x: number; y: number }>>;
              fog_mode?: string;
            };
            onMapFullStateRef.current?.({
              pieces: (p.pieces ?? []).map(fromPiecePayload),
              walls: (p.walls ?? []).map(
                (w) => objToCamelCase(w as Record<string, unknown>) as unknown as WallSegment,
              ),
              visiblePolygons: parsePolys(p.visible_polygons ?? []),
              fogMode: p.fog_mode === "explored" ? "explored" : "live",
            });
          } else if (msg.type === "visibility_updated") {
            const p = msg.payload as {
              visible_polygons?: Array<Array<{ x: number; y: number }>>;
            };
            onVisibilityUpdatedRef.current?.(parsePolys(p.visible_polygons ?? []));
          } else if (msg.type === "wall_revealed") {
            const p = msg.payload as { wall: Record<string, unknown> };
            onWallRevealedRef.current?.(
              objToCamelCase(p.wall) as unknown as WallSegment,
            );
          }
        } catch {
          // ignore malformed messages
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
  useEffect(() => {
    if (!isMaster || !board || status !== "connected") return;
    sendBoardSync();
  }, [isMaster, board, status, sendBoardSync]);

  /** Send a player action (enqueue_action). */
  const sendAction = useCallback(
    (payload: {
      target_id?: string[];
      interact?: { kind: string };
      move?: { from: [number, number, number]; position: [number, number, number]; category: string };
      attack?: { hit: { skill_name: string }; damage: { skill_name: string } };
    }) => {
      sendRaw("enqueue_action", payload);
    },
    [sendRaw],
  );

  /** Send a master action (enqueue_master_action). */
  const sendMasterAction = useCallback(
    (payload: {
      target_ids: string[];
      interact?: { kind: string };
      attack?: { hit: { skill_name: string }; damage: { skill_name: string } };
    }) => {
      sendRaw("enqueue_master_action", payload);
    },
    [sendRaw],
  );

  return { status, sendAction, sendMasterAction };
}
