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

  it("translates the stacked pull refusal", () => {
    expect(combatErrorText("game_error", "action is stacked on a pending move", "pull_action")).toBe(
      "Este movimento está empilhado em outro que ainda não abriu — abra aquele primeiro.",
    );
  });

  it("mensagem de domínio desconhecida mantém o prefixo", () => {
    expect(combatErrorText("game_error", "algo novo", "cancel_action")).toBe("Não foi possível cancelar a ação: algo novo");
  });
});

describe("combatErrorText: story clock", () => {
  it.each([
    ["clock_not_set", "Defina a hora da partida antes."],
    ["clock_already_set", "A hora inicial já foi definida."],
    ["clock_below_limit", "Não dá para voltar antes do limite do relógio."],
    ["clock_long_skip_unconfirmed", "Confirme o avanço de mais de 2 dias."],
    ["clock_play_in_race", "No turno disputado, cada round vale 1 segundo: o tempo real fica desligado."],
    ["clock_already_running", "O tempo real já está ligado."],
    ["match_in_battle", "Encerre o combate antes de encerrar a partida."],
    ["not_battle_scene", "A cena atual não é de combate."],
    ["match_already_ended", "A partida já foi encerrada."],
  ])("%s has Portuguese copy", (code, text) => {
    expect(combatErrorText(code, "")).toBe(text);
  });
});

describe("combatErrorText: clock_below_limit when ending", () => {
  it.each(["end_match", "change_scene"])("%s explains the running round's extra second", (sentType) => {
    expect(combatErrorText("clock_below_limit", "below", sentType)).toBe(
      "A hora do fim não pode ficar antes do mínimo (o round em andamento soma 1 s).",
    );
  });
  it("other sends keep the generic copy", () => {
    expect(combatErrorText("clock_below_limit", "", "set_clock")).toBe(
      "Não foi possível mudar o relógio: Não dá para voltar antes do limite do relógio.",
    );
  });
});
