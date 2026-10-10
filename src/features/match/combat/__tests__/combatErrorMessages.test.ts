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

  it("traduz as mensagens de domínio documentadas, sem prefixo", () => {
    expect(combatErrorText("game_error", "action queue is empty", "open_next_action")).toBe("A fila de ações está vazia.");
    expect(combatErrorText("game_error", "action not found in queue", "cancel_action")).toBe("A ação já não está na fila.");
    expect(combatErrorText("game_error", "action actor does not match player", "cancel_action")).toBe("Essa ação não é sua.");
  });

  it("mensagem de domínio desconhecida mantém o prefixo", () => {
    expect(combatErrorText("game_error", "algo novo", "cancel_action")).toBe("Não foi possível cancelar a ação: algo novo");
  });
});
