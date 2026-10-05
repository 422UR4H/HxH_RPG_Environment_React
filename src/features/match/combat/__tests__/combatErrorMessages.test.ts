import { describe, it, expect } from "vitest";
import { combatErrorText } from "../combatErrorMessages";

describe("combatErrorText", () => {
  it("not_participant vira texto em PT-BR, com o prefixo do envio", () => {
    expect(combatErrorText("not_participant", "", "enqueue_master_action")).toBe(
      "Não foi possível executar a ação do mestre: Esse personagem não está na partida.",
    );
  });

  it("game_error passa a prosa do domínio como veio", () => {
    expect(combatErrorText("game_error", "not enough balance")).toBe("not enough balance");
  });
});
