import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticalMap } from "../../../../types/tacticalMap";

// Função simples (não vi.fn): o spy do vitest anexa handler à promessa rejeitada e o
// resultado vira unhandled rejection. Registramos as chamadas à mão.
const { calls, load } = vi.hoisted(() => {
  const calls: string[] = [];
  return { calls, load: (url: string) => { calls.push(url); return Promise.reject(new Error("403")); } };
});
vi.mock("pixi.js", async (orig) => {
  const actual = await orig<typeof import("pixi.js")>();
  return { ...actual, Assets: { load } };
});

import BgLayer from "../BgLayer";

const bg = { url: "https://r2.example/bg.png", x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1 } as NonNullable<TacticalMap["bg"]>;

describe("BgLayer — falha de carga", () => {
  beforeEach(() => { calls.length = 0; });

  it("chama onError quando Assets.load rejeita", async () => {
    const onError = vi.fn();
    const onLoadingChange = vi.fn();
    render(<BgLayer bg={bg} onError={onError} onLoadingChange={onLoadingChange} />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onLoadingChange).toHaveBeenLastCalledWith(false);
  });

  it("retryKey novo dispara nova carga da mesma URL", async () => {
    const onError = vi.fn();
    const { rerender } = render(<BgLayer bg={bg} onError={onError} onLoadingChange={() => {}} retryKey={0} />);
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(calls).toHaveLength(1);
    rerender(<BgLayer bg={bg} onError={onError} onLoadingChange={() => {}} retryKey={1} />);
    await waitFor(() => expect(calls).toHaveLength(2));
    // Mesma URL, sem query string (URLs do R2 podem ser assinadas).
    expect(calls).toEqual([bg.url, bg.url]);
  });
});
