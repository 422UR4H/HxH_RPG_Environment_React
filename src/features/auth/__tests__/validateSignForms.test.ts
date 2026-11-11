import { describe, it, expect } from "vitest";
import { byteLength, validateLogin, validateRegister } from "../validateSignForms";

const validRegister = {
  email: "teste@mail.com",
  nick: "Tester",
  password: "12345678",
  confirmPass: "12345678",
};

describe("validateLogin", () => {
  it("login: empty fields get their own messages", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Informe o e-mail.",
      password: "Informe a senha.",
    });
  });

  it("login: malformed email is rejected", () => {
    expect(validateLogin({ email: "sem-arroba", password: "x" })).toEqual({
      email: "E-mail inválido.",
    });
    expect(validateLogin({ email: "a@b", password: "x" })).toEqual({ email: "E-mail inválido." });
  });

  it("login: password length is left to the server", () => {
    expect(validateLogin({ email: "teste@mail.com", password: "abc" })).toEqual({});
  });
});

describe("validateRegister", () => {
  it("register: email shorter than 12 bytes is rejected", () => {
    expect(validateRegister({ ...validRegister, email: "a@b.co" }).email).toBe(
      "O e-mail deve ter entre 12 e 64 caracteres.",
    );
  });

  it("register: nick counts characters, not bytes", () => {
    const ok = "ãããããããããããããããããããã"; // 20 caracteres, 40 bytes
    expect(byteLength(ok)).toBe(40);
    expect(validateRegister({ ...validRegister, nick: ok }).nick).toBeUndefined();

    expect(validateRegister({ ...validRegister, nick: `${ok}ã` }).nick).toBe(
      "O nick deve ter entre 3 e 20 caracteres.",
    );
    expect(validateRegister({ ...validRegister, nick: "ab" }).nick).toBe(
      "O nick deve ter entre 3 e 20 caracteres.",
    );
  });

  it.each([["start", "😀Tester"], ["middle", "Tes😀ter"], ["end", "Tester😀"]])(
    "register: an emoji at the %s of the nick is rejected",
    (_pos, nick) => {
      expect(validateRegister({ ...validRegister, nick }).nick).toBe("Emojis não são permitidos neste campo.");
    },
  );

  it.each([["start", "😀teste@mail.com"], ["middle", "tes😀te@mail.com"], ["end", "teste@mail.com😀"]])(
    "register: an emoji at the %s of the e-mail is rejected",
    (_pos, email) => {
      expect(validateRegister({ ...validRegister, email }).email).toBe("Emojis não são permitidos neste campo.");
    },
  );

  it("register: accented text in the nick passes", () => {
    expect(validateRegister({ ...validRegister, nick: "José Ção" }).nick).toBeUndefined();
  });

  it("login does not reject an emoji in the e-mail locally", () => {
    expect(validateLogin({ email: "te😀ste@mail.com", password: "12345678" })).toEqual({});
  });

  it("register: password under 8 and over 64 are rejected", () => {
    expect(validateRegister({ ...validRegister, password: "1234567", confirmPass: "1234567" }).password).toBe(
      "A senha deve ter pelo menos 8 caracteres.",
    );
    const long = "a".repeat(65);
    expect(validateRegister({ ...validRegister, password: long, confirmPass: long }).password).toBe(
      "A senha deve ter no máximo 64 caracteres.",
    );
  });

  it("register: mismatched confirmation is rejected", () => {
    expect(validateRegister({ ...validRegister, confirmPass: "87654321" })).toEqual({
      confirmPass: "As senhas não coincidem.",
    });
    expect(validateRegister({ ...validRegister, confirmPass: "" })).toEqual({
      confirmPass: "Confirme a senha.",
    });
  });

  it("valid forms return no errors", () => {
    expect(validateRegister(validRegister)).toEqual({});
    expect(validateLogin({ email: "teste@mail.com", password: "12345678" })).toEqual({});
  });
});
