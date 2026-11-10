import { describe, it, expect } from "vitest";
import { coalesce, noticeText } from "../clockNotice";

const A = "2000-01-01T08:00:00";
const B = "2000-01-01T09:00:00";

describe("noticeText", () => {
  it("forward adjust has no sign", () => {
    expect(noticeText({ kind: "adjust", from: A, to: B, deltaSeconds: 3600 })).toBe(
      "O mestre avançou o tempo 1 h — agora 01/01/2000 09:00:00",
    );
  });
  it("backward set drops the sign", () => {
    expect(noticeText({ kind: "set", from: B, to: A, deltaSeconds: -3600 })).toBe(
      "O mestre voltou o tempo 1 h — agora 01/01/2000 08:00:00",
    );
  });
  it("play", () => expect(noticeText({ kind: "play" })).toBe("O mestre ligou o tempo real"));
  it("manual pause shows elapsed", () => {
    expect(noticeText({ kind: "pause", reason: "manual", from: A, to: "2000-01-01T11:00:00", elapsedSeconds: 192 })).toBe(
      "O mestre pausou o tempo real (+3 min 12 s)",
    );
  });
  it("manual pause without elapsedSeconds omits the parenthesis", () => {
    expect(noticeText({ kind: "pause", reason: "manual", from: A, to: B })).toBe("O mestre pausou o tempo real");
  });
  it("other pause reasons", () => {
    expect(noticeText({ kind: "pause", reason: "roundMode" })).toBe("O tempo real pausou (troca de regime)");
    expect(noticeText({ kind: "pause", reason: "scene" })).toBe("O tempo real pausou (troca de cena)");
    expect(noticeText({ kind: "pause", reason: "masterLeft" })).toBe("O tempo real pausou (o mestre saiu)");
    expect(noticeText({ kind: "pause", reason: "end" })).toBe("O tempo real pausou (fim da partida)");
    expect(noticeText({ kind: "pause", reason: "restart" })).toBe("O tempo real pausou (reinício do servidor)");
  });
  it("multi-part forward delta has no sign", () => {
    expect(noticeText({ kind: "adjust", from: A, to: "2000-01-01T10:10:00", deltaSeconds: 7800 })).toBe(
      "O mestre avançou o tempo 2 h 10 min — agora 01/01/2000 10:10:00",
    );
  });
  it("start", () => {
    expect(noticeText({ kind: "start", to: A })).toBe("A partida começa às 08:00:00 de 01/01/2000");
  });
  it("scene with a move is neutral", () => {
    expect(noticeText({ kind: "scene", from: A, to: B })).toBe("Nova cena — agora 01/01/2000 09:00:00");
    expect(noticeText({ kind: "scene" })).toBeNull();
  });
  it("round, limit and end are silent", () => {
    for (const kind of ["round", "limit", "end"] as const) expect(noticeText({ kind, to: B })).toBeNull();
  });
});

describe("coalesce", () => {
  it("sums two +60 s adjusts", () => {
    const m = coalesce(
      { kind: "adjust", from: "2000-01-01T08:00:00", to: "2000-01-01T08:01:00", deltaSeconds: 60 },
      { kind: "adjust", from: "2000-01-01T08:01:00", to: "2000-01-01T08:02:00", deltaSeconds: 60 },
    );
    expect(m).toMatchObject({ from: "2000-01-01T08:00:00", to: "2000-01-01T08:02:00", deltaSeconds: 120 });
    expect(noticeText(m)).toContain("avançou o tempo 2 min —");
  });
  it("anything else replaces", () => {
    const next = { kind: "play" as const };
    expect(coalesce({ kind: "adjust", deltaSeconds: 60, to: A }, next)).toBe(next);
  });
  it("set without deltaSeconds merges by the distance between times", () => {
    const m = coalesce(
      { kind: "adjust", from: "2000-01-01T08:00:00", to: "2000-01-01T08:01:00", deltaSeconds: 60 },
      { kind: "set", from: "2000-01-01T08:01:00", to: "2000-01-01T08:05:00" },
    );
    expect(m.deltaSeconds).toBe(300);
  });
  it("a merge that nets to zero is silent", () => {
    const m = coalesce(
      { kind: "adjust", from: A, to: B, deltaSeconds: 3600 },
      { kind: "adjust", from: B, to: A, deltaSeconds: -3600 },
    );
    expect(noticeText(m)).toBeNull();
  });
  it("unknown pause reason falls back without parenthesis", () => {
    expect(noticeText({ kind: "pause", reason: "xyz" as never })).toBe("O tempo real pausou");
  });
});
