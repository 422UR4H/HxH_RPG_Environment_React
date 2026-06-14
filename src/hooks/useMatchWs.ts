import { useCallback, useEffect, useRef, useState } from "react";
import type { WallSegment } from "../types/tacticalMap";
import { objToSnakeCase } from "../utils/caseConverter";

export type MatchWsStatus = "connecting" | "connected" | "disconnected";

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
  /** Full walls list to seed the room on connect (master only). */
  walls?: WallSegment[];
  /** Grid cell size for movement blocking on the server side. */
  cellSize?: number;
};

export function useMatchWs({
  matchUuid,
  token,
  isMaster,
  onWallStateChanged,
  walls,
  cellSize,
}: UseMatchWsOptions) {
  const [status, setStatus] = useState<MatchWsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const onWallStateChangedRef = useRef(onWallStateChanged);
  onWallStateChangedRef.current = onWallStateChanged;
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const cellSizeRef = useRef(cellSize);
  cellSizeRef.current = cellSize;
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
    sendRaw("lobby_state_sync", {
      pieces: [], // pieces are managed by useLobbyWs; here we sync only walls
      walls: ws.map((w) => objToSnakeCase(w)),
      grid: { cell_size: cs },
    });
  }, [sendRaw]);

  useEffect(() => {
    if (!matchUuid) return;
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      setStatus("connected");
      sendWallSync();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; payload: unknown };
        if (msg.type === "wall_state_changed") {
          const p = msg.payload as WallStateChangedPayload;
          onWallStateChangedRef.current?.(p.wall_id, p.open, p.locked);
        }
        // TODO: handle additional game-phase message types as they are added.
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => setStatus("disconnected");
    ws.onerror = () => setStatus("disconnected");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [matchUuid, token, sendWallSync]);

  /** Send a player action (enqueue_action). */
  const sendAction = useCallback(
    (payload: {
      target_id?: string[];
      interact?: { kind: string };
      move?: { from: [number, number, number]; position: [number, number, number]; category: string };
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
    }) => {
      sendRaw("enqueue_master_action", payload);
    },
    [sendRaw],
  );

  return { status, sendAction, sendMasterAction };
}
