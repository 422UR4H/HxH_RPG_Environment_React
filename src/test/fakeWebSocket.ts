import { act } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Socket de teste para os hooks da partida. `readyState` já nasce OPEN porque os hooks só
 * enviam com `ws.readyState === WebSocket.OPEN` — sem isso todo envio some em silêncio.
 */
export class FakeWS {
  static instances: FakeWS[] = [];
  static OPEN = 1;
  onopen?: () => void;
  onmessage?: (e: MessageEvent) => void;
  onclose?: (e: CloseEvent) => void;
  onerror?: () => void;
  readyState = 1;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWS.instances.push(this);
  }
  send = vi.fn();
  close = vi.fn();
  emit(type: string, payload: unknown, envelope: Record<string, unknown> = {}) {
    this.onmessage?.({ data: JSON.stringify({ type, payload, ...envelope }) } as MessageEvent);
  }
  /** Os `payload`s já enviados de um `type`. */
  sent(type: string): unknown[] {
    return this.send.mock.calls
      .map(([raw]) => JSON.parse(raw as string) as { type: string; payload: unknown })
      .filter((m) => m.type === type)
      .map((m) => m.payload);
  }
}

export function installFakeWebSocket() {
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");
}

/**
 * `useMatchWs` conecta um tick depois de montar (proteção contra o StrictMode). Com timers
 * falsos, avança esse tick e devolve o socket de índice `index`.
 */
export function flushConnect(index = 0): FakeWS {
  act(() => { vi.advanceTimersByTime(0); });
  const ws = FakeWS.instances[index];
  if (!ws) throw new Error(`no socket #${index} after flushing the connect tick`);
  return ws;
}

/** Com timers reais: espera o socket de índice `index` existir. */
export async function waitForSocket(index = 0): Promise<FakeWS> {
  await vi.waitFor(() => {
    if (!FakeWS.instances[index]) throw new Error("socket not created yet");
  });
  return FakeWS.instances[index];
}
