import { describe, it, expect } from "vitest";
import { composerUnavailableReason } from "../composerAvailability";

describe("composerUnavailableReason", () => {
  it("is available when connected with a board", () => {
    expect(composerUnavailableReason("connected", true)).toBeUndefined();
  });
  it("asks to wait for the master when waiting or without a board", () => {
    expect(composerUnavailableReason("waiting", false)).toBe("Aguarde o mestre abrir a sala para agir.");
    expect(composerUnavailableReason("connected", false)).toBe("Aguarde o mestre abrir a sala para agir.");
  });
  it("says it is connecting while connecting or waking", () => {
    expect(composerUnavailableReason("connecting", false)).toBe("Conectando à mesa…");
    expect(composerUnavailableReason("waking", true)).toBe("Conectando à mesa…");
  });
  it("says there is no connection otherwise", () => {
    expect(composerUnavailableReason("disconnected", true)).toBe("Sem conexão com a mesa.");
    expect(composerUnavailableReason("replaced", true)).toBe("Sem conexão com a mesa.");
  });
});
