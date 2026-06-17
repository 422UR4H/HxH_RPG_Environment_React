import { useCallback, useEffect, useRef, useState } from "react";
import type { GridShape, WallSegment } from "../types/tacticalMap";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";

export type MatchWsStatus = "connecting" | "connected" | "disconnected";

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
    pieces: unknown[];
    walls: WallSegment[];
    visiblePolygons: Array<Array<[number, number]>>;
    exploredCells: Array<[number, number]>;
    fogMode: "live" | "explored";
  }) => void;
  /** Called when visibility polygons change after a move. */
  onVisibilityUpdated?: (
    visiblePolygons: Array<Array<[number, number]>>,
    exploredDelta: Array<[number, number]>,
  ) => void;
  /** Called when a secret door is revealed by the master. */
  onWallRevealed?: (wall: WallSegment) => void;
  /** Full walls list to seed the room on connect (master only). */
  walls?: WallSegment[];
  /** Grid cell size for movement blocking on the server side. */
  cellSize?: number;
  /** Full grid shape to send to the server on connect (master only). */
  grid?: GridShape;
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
  walls,
  cellSize,
  grid,
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
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const isMasterRef = useRef(isMaster);
  isMasterRef.current = isMaster;

  const sendRaw = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // Seed the server's in-memory wall state on connect.
  const sendWallSync = useCallback(() => {
    if (!isMasterRef.current) return;
    const ws = wallsRef.current ?? [];
    const cs = cellSizeRef.current ?? 64;
    sendRaw("map_state_sync", {
      pieces: [], // pieces are managed by useLobbyWs; here we sync only walls
      walls: ws.map((w) => objToSnakeCase(w)),
      grid: gridRef.current ? objToSnakeCase(gridRef.current) : { cell_size: cs },
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
        sendWallSync();
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
              pieces?: unknown[];
              walls?: unknown[];
              visible_polygons?: Array<Array<{ x: number; y: number }>>;
              explored_cells?: Array<[number, number]>;
              fog_mode?: string;
            };
            onMapFullStateRef.current?.({
              pieces: p.pieces ?? [],
              walls: (p.walls ?? []).map(
                (w) => objToCamelCase(w as Record<string, unknown>) as unknown as WallSegment,
              ),
              visiblePolygons: parsePolys(p.visible_polygons ?? []),
              exploredCells: p.explored_cells ?? [],
              fogMode: p.fog_mode === "explored" ? "explored" : "live",
            });
          } else if (msg.type === "visibility_updated") {
            const p = msg.payload as {
              visible_polygons?: Array<Array<{ x: number; y: number }>>;
              explored_delta?: Array<[number, number]>;
            };
            onVisibilityUpdatedRef.current?.(
              parsePolys(p.visible_polygons ?? []),
              p.explored_delta ?? [],
            );
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
  }, [matchUuid, token, sendWallSync]);

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
