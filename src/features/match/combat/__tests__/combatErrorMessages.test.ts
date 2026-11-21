import { describe, it, expect } from "vitest";
import { combatErrorText } from "../combatErrorMessages";

describe("combatErrorText", () => {
  it("shows the server message as-is for game_error", () => {
    expect(combatErrorText("game_error", "A fila de ações está vazia.")).toBe("A fila de ações está vazia.");
  });

  it("shows the server message once, with no duplicated message in parentheses", () => {
    expect(combatErrorText("forbidden", "Só o mestre pode fazer isso.")).toBe("Só o mestre pode fazer isso.");
  });

  it("keeps the send prefix before the server message", () => {
    expect(combatErrorText("forbidden", "Só o mestre pode fazer isso.", "open_reaction")).toBe(
      "Não foi possível dar a palavra: Só o mestre pode fazer isso.",
    );
    expect(combatErrorText("game_error", "Essa ação não é sua.", "attach_reaction")).toBe(
      "Não foi possível reagir: Essa ação não é sua.",
    );
  });

  it("falls back to the code text when the message is empty, with the send prefix", () => {
    expect(combatErrorText("not_participant", "", "enqueue_master_action")).toBe(
      "Não foi possível executar a ação do mestre: Esse personagem não está na partida.",
    );
  });

  it("uses a generic text for an unknown code with no message", () => {
    expect(combatErrorText("game_error", "")).toBe("Erro do servidor.");
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
