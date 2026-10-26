import { useEffect, useRef, useState, useCallback } from "react";
import { createReconnectPolicy } from "./reconnectPolicy";
import type { BgImage, GridShape, SlotCoord, WallSegment } from "../types/tacticalMap";

export type WsStatus =
  | "connecting"
  | "connected"
  /** O servidor da mesa não respondeu; seguimos tentando (ele pode estar acordando). */
  | "waking"
  /** A janela de tentativas esgotou; só `reconnect()` abre uma nova. */
  | "unreachable"
  | "lobby_not_open"
  | "kicked"
  | "lobby_closed"
  /** A mesma conta abriu o lobby em outra conexão, e o servidor ficou com ela (B4). */
  | "replaced";

export type LobbyParticipant = {
  uuid: string;
  nickname: string;
  isMaster: boolean;
  isOnline: boolean;
};

// Shape of each piece entry inside map_full_state (server→client).
export type LobbyPieceFullState = {
  pieceId: string;
  characterId: string;
  slot: SlotCoord;
  visible?: boolean;
};

// The lobby's map_full_state: the match BOARD (not the campaign map) — its pieces, walls
// (secret doors masked for players by the server), grid and background. `grid` undefined =
// the room has no board; `bg` null = a board with no background, undefined = no board.
export type LobbyFullState = {
  pieces: LobbyPieceFullState[];
  walls: WallSegment[];
  grid: GridShape | undefined;
  bg: BgImage | undefined;
};

interface UseLobbyWsParams {
  matchUuid: string;
  token: string;
  nickname: string;
  userUuid?: string;
  enabled?: boolean;
  onMatchStarted: () => void;
  onKicked?: () => void;
  onPieceMoved?: (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean, z?: number) => void;
  onPieceRemoved?: (pieceId: string) => void;
  // Fires when the server sends the full current board to a newly joined client.
  onFullState?: (state: LobbyFullState) => void;
  /** `error` `board_unavailable` (s→c, ao conectar): a sala não carregou o tabuleiro; um `map_full_state` posterior o supera. */
  onBoardUnavailable?: () => void;
}

interface UseLobbyWsResult {
  status: WsStatus;
  participants: LobbyParticipant[];
  sendStartMatch: () => void;
  sendKick: (userUuid: string) => void;
  sendCancelLobby: () => void;
  sendPieceMoved: (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean, z?: number) => void;
  sendPieceRemoved: (pieceId: string) => void;
  /** Zera a política e abre uma conexão nova (a partir de `unreachable`). */
  reconnect: () => void;
}

const TERMINAL_STATUSES: WsStatus[] = [
  "lobby_not_open",
  "kicked",
  "lobby_closed",
  "unreachable",
  // Reconectar tomaria o lugar da outra conexão, que retomaria o desta — para sempre.
  "replaced",
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
  onBoardUnavailable,
}: UseLobbyWsParams): UseLobbyWsResult {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [participants, setParticipants] = useState<LobbyParticipant[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<WsStatus>("connecting");
  const [connectNonce, setConnectNonce] = useState(0);
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
  const onBoardUnavailableRef = useRef(onBoardUnavailable);
  onBoardUnavailableRef.current = onBoardUnavailable;
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
    const policy = createReconnectPolicy();

    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws?match_uuid=${matchUuid}&token=${encodeURIComponent(token)}&nickname=${encodeURIComponent(nickname)}`;

    function connect() {
      if (!active) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      // Durante a janela de acordar, o status segue "waking" entre as tentativas.
      if (statusRef.current !== "waking") updateStatus("connecting");

      ws.onopen = () => {
        if (!active) {
          ws.close();
          return;
        }
        updateStatus("connected");
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!active) return;
        // Qualquer mensagem prova que a conexão está viva: a próxima queda ganha janela nova.
        policy.reset();

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
              isMaster: boolean;
              isOnline: boolean;
            }> | undefined) ?? [];
            setParticipants(
              players.map((p) => ({
                uuid: p.uuid,
                nickname: p.nickname,
                isMaster: p.isMaster,
                isOnline: p.isOnline,
              }))
            );
            break;
          }
          case "player_joined":
          case "master_joined": {
            const p = payload as { uuid: string; nickname: string; isMaster: boolean; isOnline: boolean };
            setParticipants((prev) => [
              ...prev,
              { uuid: p.uuid, nickname: p.nickname, isMaster: p.isMaster, isOnline: true },
            ]);
            break;
          }
          case "player_left":
          case "master_left": {
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
          case "error":
            if (payload.code === "connection_replaced") updateStatus("replaced");
            else if (payload.code === "board_unavailable") onBoardUnavailableRef.current?.();
            break;
          case "match_started":
            onMatchStartedRef.current();
            break;
          case "piece_moved": {
            const p = payload as {
              pieceId: string;
              slot: { kind: string; col?: number; row?: number; q?: number; r?: number };
              characterId?: string;
              visible?: boolean;
              z?: number;
            };
            if (!p.pieceId || !p.slot) break;
            let slot: SlotCoord;
            if (p.slot.kind === "square" && p.slot.col != null && p.slot.row != null) {
              slot = { kind: "square", col: p.slot.col, row: p.slot.row };
            } else if (p.slot.kind === "hex" && p.slot.q != null && p.slot.r != null) {
              slot = { kind: "hex", q: p.slot.q, r: p.slot.r };
            } else {
              break;
            }
            onPieceMovedRef.current?.(p.pieceId, slot, p.characterId, p.visible, p.z ?? 0);
            break;
          }
          case "piece_removed": {
            const p = payload as { pieceId?: string };
            if (p.pieceId) onPieceRemovedRef.current?.(p.pieceId);
            break;
          }
          case "map_full_state": {
            const rawPieces = (payload.pieces as Array<{
              pieceId: string;
              slot: { kind: string; col?: number; row?: number; q?: number; r?: number };
              characterId?: string;
              visible?: boolean;
            }> | undefined) ?? [];
            const pieces: LobbyPieceFullState[] = [];
            for (const p of rawPieces) {
              if (!p.pieceId || !p.slot || !p.characterId) continue;
              let slot: SlotCoord;
              if (p.slot.kind === "square" && p.slot.col != null && p.slot.row != null) {
                slot = { kind: "square", col: p.slot.col, row: p.slot.row };
              } else if (p.slot.kind === "hex" && p.slot.q != null && p.slot.r != null) {
                slot = { kind: "hex", q: p.slot.q, r: p.slot.r };
              } else {
                continue;
              }
              pieces.push({ pieceId: p.pieceId, characterId: p.characterId, slot, visible: p.visible });
            }
            onFullStateRef.current?.({
              pieces,
              walls: (payload.walls as WallSegment[] | undefined) ?? [],
              grid: (payload.grid as GridShape | undefined) ?? undefined,
              bg: payload.bg === null ? null : ((payload.bg as BgImage | undefined) ?? undefined),
            });
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

        const delay = policy.nextDelay(Date.now());
        if (delay === null) {
          updateStatus("unreachable");
          return;
        }

        updateStatus("waking");
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      // Quem decide o status é o onclose; o onerror sempre vem seguido de um.
      ws.onerror = () => {};
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
  }, [matchUuid, token, nickname, enabled, updateStatus, connectNonce]);

  const reconnect = useCallback(() => setConnectNonce((n) => n + 1), []);

  const sendMessage = useCallback((type: string, payload: unknown = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const sendStartMatch = useCallback(() => sendMessage("start_match"), [sendMessage]);
  const sendCancelLobby = useCallback(() => sendMessage("cancel_lobby"), [sendMessage]);
  const sendKick = useCallback(
    (userUuid: string) => sendMessage("kick_player", { playerUuid: userUuid }),
    [sendMessage]
  );

  const sendPieceMoved = useCallback(
    (pieceId: string, slot: SlotCoord, characterId?: string, visible?: boolean, z?: number) => {
      const slotPayload =
        slot.kind === "square"
          ? { kind: "square", col: slot.col, row: slot.row }
          : { kind: "hex", q: slot.q, r: slot.r };
      sendMessage("piece_moved", {
        pieceId,
        slot: slotPayload,
        ...(characterId != null && { characterId }),
        ...(visible != null && { visible }),
        ...(z != null && { z }),
      });
    },
    [sendMessage],
  );

  const sendPieceRemoved = useCallback(
    (pieceId: string) => sendMessage("piece_removed", { pieceId }),
    [sendMessage],
  );

  return { status, participants, sendStartMatch, sendKick, sendCancelLobby, sendPieceMoved, sendPieceRemoved, reconnect };
}
