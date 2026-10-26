import { describe, it, expect } from "vitest";
import { missingRequiredMessage } from "../requiredFields";

describe("missingRequiredMessage", () => {
  it("returns null when every required field has a value", () => {
    expect(missingRequiredMessage([{ label: "Nome", value: "Yorknew" }])).toBeNull();
  });

  it("names the single missing field", () => {
    expect(
      missingRequiredMessage([
        { label: "Nome da Campanha", value: "Yorknew" },
        { label: "Descrição Breve", value: "" },
      ]),
    ).toBe("Preencha o campo obrigatório: Descrição Breve.");
  });

  it("lists several missing fields in reading order", () => {
    expect(
      missingRequiredMessage([
        { label: "Título da Partida", value: "" },
        { label: "Descrição Breve", value: "  " },
        { label: "Data e Hora da Sessão", value: "" },
      ]),
    ).toBe("Preencha os campos obrigatórios: Título da Partida, Descrição Breve e Data e Hora da Sessão.");
  });
});
