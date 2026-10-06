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

  it("prefixa as recusas de reagir e de dar a palavra", () => {
    expect(combatErrorText("game_error", "this character already reacted to the open action", "attach_reaction"))
      .toBe("Não foi possível reagir: this character already reacted to the open action");
    expect(combatErrorText("forbidden", "only the master can perform this action", "open_reaction"))
      .toBe("Não foi possível dar a palavra: Só o mestre pode fazer isso. (only the master can perform this action)");
  });
});
