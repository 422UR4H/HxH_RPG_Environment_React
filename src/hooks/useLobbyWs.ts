import { useEffect, useRef, useState, useCallback } from "react";
import type { SlotCoord, Piece } from "../types/tacticalMap";

export type WsStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "lobby_not_open"
  | "kicked"
  | "lobby_closed"
  | "throttled"
  | "error";

export type LobbyParticipant = {
  uuid: string;
  nickname: string;
  isMaster: boolean;
  isOnline: boolean;
};

// Shape of each piece entry inside lobby_full_state (server→client).
export type LobbyPieceFullState = {
  pieceId: string;
  characterId: string;
  slot: SlotCoord;
  visible?: boolean;
};

interface UseLobbyWsParams {
  matchUuid: string;
  token: string;
  nickname: string;
  userUuid?: string;
  enabled?: boolean;
  onMatchStarted: () => void;
  onKicked?: () => void;
  onPieceMoved?: (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean) => void;
  onPieceRemoved?: (pieceId: string) => void;
  // Fires when the server sends the full current board to a newly joined client.
  onFullState?: (pieces: LobbyPieceFullState[]) => void;
}

interface UseLobbyWsResult {
  status: WsStatus;
  participants: LobbyParticipant[];
  sendStartMatch: () => void;
  sendKick: (userUuid: string) => void;
  sendCancelLobby: () => void;
  sendPieceMoved: (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean) => void;
  sendPieceRemoved: (pieceId: string) => void;
  // Master calls this on WS connect to seed the backend's in-memory board with
  // the current DB state, so late-joining players receive the correct board.
  sendLobbySync: (pieces: Piece[]) => void;
}

const MAX_RECONNECTS = 5;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

const TERMINAL_STATUSES: WsStatus[] = [
  "lobby_not_open",
  "kicked",
  "lobby_closed",
  "throttled",
];

export function useLobbyWs({
  matchUuid,
  token,
  nickname,
  userUuid,
  enabled = true,
  onMatchStarted,
  onKicked,
  onPieceMoved,
  onPieceRemoved,
  onFullState,
}: UseLobbyWsParams): UseLobbyWsResult {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [participants, setParticipants] = useState<LobbyParticipant[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<WsStatus>("connecting");
  const reconnectCountRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMatchStartedRef = useRef(onMatchStarted);
  onMatchStartedRef.current = onMatchStarted;
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;
  const onPieceMovedRef = useRef(onPieceMoved);
  onPieceMovedRef.current = onPieceMoved;
  const onPieceRemovedRef = useRef(onPieceRemoved);
  onPieceRemovedRef.current = onPieceRemoved;
  const onFullStateRef = useRef(onFullState);
  onFullStateRef.current = onFullState;
  const userUuidRef = useRef(userUuid);
  userUuidRef.current = userUuid;

  const updateStatus = useCallback((next: WsStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    if (!token || !matchUuid || !enabled) return;

    // active = false once this effect instance is torn down (unmount or dep change).
    // All WS callbacks check this flag so a stale closure never mutates state
    // or triggers a reconnect — this correctly handles React Strict Mode's
    // mount → cleanup → remount cycle in development.
    let active = true;
    reconnectCountRef.current = 0;

    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${encodeURIComponent(token)}&nickname=${encodeURIComponent(nickname)}`;

    function connect() {
      if (!active) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      updateStatus("connecting");

      ws.onopen = () => {
        if (!active) {
          ws.close();
          return;
        }
        updateStatus("connected");
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!active) return;

        let msg: { type: string; payload: Record<string, unknown> };
        try {
          msg = JSON.parse(event.data as string) as { type: string; payload: Record<string, unknown> };
        } catch {
          return;
        }

        const payload: Record<string, unknown> = msg.payload ?? {};

        switch (msg.type) {
          case "room_state": {
            const players = (payload.players as Array<{
              uuid: string;
              nickname: string;
              is_master: boolean;
              is_online: boolean;
            }> | undefined) ?? [];
            setParticipants(
              players.map((p) => ({
                uuid: p.uuid,
                nickname: p.nickname,
                isMaster: p.is_master,
                isOnline: p.is_online,
              }))
            );
            break;
          }
          case "player_joined": {
            const p = payload as { uuid: string; nickname: string; is_master: boolean; is_online: boolean };
            setParticipants((prev) => [
              ...prev,
              { uuid: p.uuid, nickname: p.nickname, isMaster: p.is_master, isOnline: true },
            ]);
            break;
          }
          case "player_left": {
            const p = payload as { uuid: string };
            setParticipants((prev) => prev.filter((x) => x.uuid !== p.uuid));
            break;
          }
          case "player_kicked": {
            const kicked = payload as { uuid?: string };
            if (kicked.uuid && kicked.uuid === userUuidRef.current) {
              onKickedRef.current?.();
            }
            break;
          }
          case "lobby_not_open":
            updateStatus("lobby_not_open");
            break;
          case "lobby_closed":
            updateStatus("lobby_closed");
            break;
          case "match_started":
            onMatchStartedRef.current();
            break;
          case "lobby_piece_moved": {
            const p = payload as {
              piece_id: string;
              slot: { kind: string; col?: number; row?: number; q?: number; r?: number };
              character_id?: string;
              visible?: boolean;
            };
            if (!p.piece_id || !p.slot) break;
            let slot: SlotCoord;
            if (p.slot.kind === "square" && p.slot.col != null && p.slot.row != null) {
              slot = { kind: "square", col: p.slot.col, row: p.slot.row };
            } else if (p.slot.kind === "hex" && p.slot.q != null && p.slot.r != null) {
              slot = { kind: "hex", q: p.slot.q, r: p.slot.r };
            } else {
              break;
            }
            onPieceMovedRef.current?.(p.piece_id, slot, p.character_id, p.visible);
            break;
          }
          case "lobby_piece_removed": {
            const p = payload as { piece_id?: string };
            if (p.piece_id) onPieceRemovedRef.current?.(p.piece_id);
            break;
          }
          case "lobby_full_state": {
            const rawPieces = (payload.pieces as Array<{
              piece_id: string;
              slot: { kind: string; col?: number; row?: number; q?: number; r?: number };
              character_id?: string;
              visible?: boolean;
            }> | undefined) ?? [];
            const pieces: LobbyPieceFullState[] = [];
            for (const p of rawPieces) {
              if (!p.piece_id || !p.slot || !p.character_id) continue;
              let slot: SlotCoord;
              if (p.slot.kind === "square" && p.slot.col != null && p.slot.row != null) {
                slot = { kind: "square", col: p.slot.col, row: p.slot.row };
              } else if (p.slot.kind === "hex" && p.slot.q != null && p.slot.r != null) {
                slot = { kind: "hex", q: p.slot.q, r: p.slot.r };
              } else {
                continue;
              }
              pieces.push({ pieceId: p.piece_id, characterId: p.character_id, slot, visible: p.visible });
            }
            onFullStateRef.current?.(pieces);
            break;
          }
          default:
            break;
        }
      };

      ws.onclose = (event: CloseEvent) => {
        if (!active) return;

        if (event.code === 4001) {
          updateStatus("lobby_not_open");
          return;
        }
        if (TERMINAL_STATUSES.includes(statusRef.current)) return;

        reconnectCountRef.current += 1;

        if (reconnectCountRef.current >= MAX_RECONNECTS) {
          updateStatus("throttled");
          return;
        }

        const delay = Math.min(
          BASE_DELAY_MS * Math.pow(2, reconnectCountRef.current - 1),
          MAX_DELAY_MS
        );

        updateStatus("disconnected");
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        if (!active) return;
        if (!TERMINAL_STATUSES.includes(statusRef.current)) {
          updateStatus("error");
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [matchUuid, token, nickname, enabled, updateStatus]);

  const sendMessage = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const sendStartMatch = useCallback(() => sendMessage("start_match"), [sendMessage]);
  const sendCancelLobby = useCallback(() => sendMessage("cancel_lobby"), [sendMessage]);
  const sendKick = useCallback(
    (userUuid: string) => sendMessage("kick_player", { player_uuid: userUuid }),
    [sendMessage]
  );

  const sendPieceMoved = useCallback(
    (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean) => {
      const slotPayload =
        slot.kind === "square"
          ? { kind: "square", col: slot.col, row: slot.row }
          : { kind: "hex", q: slot.q, r: slot.r };
      sendMessage("lobby_piece_moved", {
        piece_id: pieceId,
        slot: slotPayload,
        ...(characterId != null && { character_id: characterId }),
        ...(visible != null && { visible }),
      });
    },
    [sendMessage],
  );

  const sendPieceRemoved = useCallback(
    (pieceId: string) => sendMessage("lobby_piece_removed", { piece_id: pieceId }),
    [sendMessage],
  );

  const sendLobbySync = useCallback(
    (pieces: Piece[]) => {
      sendMessage("lobby_state_sync", {
        pieces: pieces.map((p) => {
          const slotPayload =
            p.coord.slot.kind === "square"
              ? { kind: "square", col: p.coord.slot.col, row: p.coord.slot.row }
              : { kind: "hex", q: p.coord.slot.q, r: p.coord.slot.r };
          return {
            piece_id: p.id,
            slot: slotPayload,
            character_id: p.characterId,
            visible: p.visible,
          };
        }),
      });
    },
    [sendMessage],
  );

  return { status, participants, sendStartMatch, sendKick, sendCancelLobby, sendPieceMoved, sendPieceRemoved, sendLobbySync };
}
