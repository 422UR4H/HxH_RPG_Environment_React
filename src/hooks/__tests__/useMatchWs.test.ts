import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMatchWs } from "../useMatchWs";

class FakeWS {
  static instances: FakeWS[] = [];
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
  emit(type: string, payload: unknown) {
    this.onmessage?.({ data: JSON.stringify({ type, payload }) } as MessageEvent);
  }
}

beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
  vi.stubEnv("VITE_WS_URL", "ws://test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useMatchWs fog events", () => {
  it("parses map_full_state into camelCase fog state", () => {
    const onMapFullState = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onMapFullState }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("map_full_state", {
      pieces: [],
      walls: [{ id: "w1", wall_type: "wall", max_hp: 100 }],
      visible_polygons: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]],
      explored_cells: [[0, 0], [1, 0]],
      fog_mode: "explored",
    });
    expect(onMapFullState).toHaveBeenCalledTimes(1);
    const arg = onMapFullState.mock.calls[0][0];
    expect(arg.fogMode).toBe("explored");
    expect(arg.walls[0].wallType).toBe("wall");
    expect(arg.visiblePolygons[0]).toEqual([[0, 0], [10, 0], [10, 10]]);
    expect(arg.exploredCells).toEqual([[0, 0], [1, 0]]);
  });

  it("parses visibility_updated", () => {
    const onVisibilityUpdated = vi.fn();
    renderHook(() =>
      useMatchWs({ matchUuid: "m1", token: "t", isMaster: false, onVisibilityUpdated }),
    );
    const ws = FakeWS.instances[0];
    ws.onopen?.();
    ws.emit("visibility_updated", {
      visible_polygons: [[{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }]],
      explored_delta: [[5, 5]],
    });
    expect(onVisibilityUpdated).toHaveBeenCalledWith([[[1, 1], [2, 1], [2, 2]]], [[5, 5]]);
  });
});
