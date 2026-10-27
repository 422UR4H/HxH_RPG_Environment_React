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

  it("register: nick counts UTF-8 bytes like the server", () => {
    const ok = "Joãozinho Silva Jr.";
    expect(ok).toHaveLength(19);
    expect(byteLength(ok)).toBe(20);
    expect(validateRegister({ ...validRegister, nick: ok }).nick).toBeUndefined();

    const over = `${ok}ã`;
    expect(over).toHaveLength(20);
    expect(byteLength(over)).toBe(22);
    expect(validateRegister({ ...validRegister, nick: over }).nick).toBe(
      "O nick deve ter entre 3 e 20 caracteres.",
    );
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
