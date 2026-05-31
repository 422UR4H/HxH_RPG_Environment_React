import { useEffect, useRef, useState, useCallback } from "react";

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

interface UseLobbyWsParams {
  matchUuid: string;
  token: string;
  nickname: string;
  userUuid?: string;
  onMatchStarted: () => void;
  onKicked?: () => void;
}

interface UseLobbyWsResult {
  status: WsStatus;
  participants: LobbyParticipant[];
  sendStartMatch: () => void;
  sendKick: (userUuid: string) => void;
  sendCancelLobby: () => void;
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
  onMatchStarted,
  onKicked,
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
  const userUuidRef = useRef(userUuid);
  userUuidRef.current = userUuid;

  const updateStatus = useCallback((next: WsStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const connect = useCallback(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${encodeURIComponent(token)}&nickname=${encodeURIComponent(nickname)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    updateStatus("connecting");

    ws.onopen = () => {
      updateStatus("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: { type: string; payload: string };
      try {
        msg = JSON.parse(event.data as string) as { type: string; payload: string };
      } catch {
        return;
      }

      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(msg.payload) as Record<string, unknown>;
      } catch {
        // empty payload is fine
      }

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
          // Kicked participants removed from list via player_left broadcast from server.
          // Self-kick detection: if the kicked uuid matches the current user, call onKicked.
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
        default:
          break;
      }
    };

    ws.onclose = () => {
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
      if (!TERMINAL_STATUSES.includes(statusRef.current)) {
        updateStatus("error");
      }
    };
  }, [matchUuid, token, nickname, updateStatus]);

  useEffect(() => {
    if (!token || !matchUuid) return;
    connect();
    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional unmount
        wsRef.current.close();
      }
    };
  }, [connect, token, matchUuid]);

  const sendMessage = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload: JSON.stringify(payload) }));
    }
  }, []);

  const sendStartMatch = useCallback(() => sendMessage("start_match"), [sendMessage]);
  const sendCancelLobby = useCallback(() => sendMessage("cancel_lobby"), [sendMessage]);
  const sendKick = useCallback(
    (userUuid: string) => sendMessage("kick_player", { player_uuid: userUuid }),
    [sendMessage]
  );

  return { status, participants, sendStartMatch, sendKick, sendCancelLobby };
}
