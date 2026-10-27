// src/pages/__tests__/RegisterPage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import RegisterPage from "../RegisterPage";
import LoginPage from "../LoginPage";
import { Route, Routes } from "react-router-dom";

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<RegisterPage />, { route: "/sign-up", token: null, user: null });
}

async function fillAndSubmit() {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("E-mail"), "teste@mail.com");
  await u.type(screen.getByLabelText("Nick"), "Tester");
  await u.type(screen.getByLabelText("Senha"), "12345678");
  await u.type(screen.getByLabelText("Confirme a senha"), "12345678");
  await u.click(screen.getByRole("button", { name: /Criar conta/i }));
}

describe("RegisterPage", () => {
  it("traduz o 409 de e-mail já cadastrado", async () => {
    server.use(
      http.post(`${baseUrl}/auth/register`, () =>
        HttpResponse.json({ detail: "validation error: email already exists" }, { status: 409 }),
      ),
    );
    renderPage();
    await fillAndSubmit();
    expect(await screen.findByText("Já existe uma conta com esse e-mail.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Já existe uma conta com esse e-mail.");
    expect(screen.queryByText(/validation error/i)).not.toBeInTheDocument();
  });

  it("usa o fallback para detail desconhecido, sem o texto cru", async () => {
    server.use(
      http.post(`${baseUrl}/auth/register`, () =>
        HttpResponse.json({ detail: "something unmapped" }, { status: 422 }),
      ),
    );
    renderPage();
    await fillAndSubmit();
    expect(await screen.findByText("Não foi possível criar a conta. Tente novamente.")).toBeInTheDocument();
    expect(screen.queryByText(/something unmapped/i)).not.toBeInTheDocument();
  });

  it("shows each field error under its field", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("E-mail"), "a@b.co");
    await u.type(screen.getByLabelText("Senha"), "123");
    await u.type(screen.getByLabelText("Confirme a senha"), "456");
    await u.click(screen.getByRole("button", { name: /Criar conta/i }));
    expect(screen.getByText("O e-mail deve ter entre 12 e 64 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("Informe um nick.")).toBeInTheDocument();
    expect(screen.getByText("A senha deve ter pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();

    await u.type(screen.getByLabelText("E-mail"), "x");
    expect(screen.queryByText("O e-mail deve ter entre 12 e 64 caracteres.")).not.toBeInTheDocument();
  });

  it("focuses the first errored field and clears only its own error on edit", async () => {
    renderPage();
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("E-mail"), "teste@mail.com");
    await u.type(screen.getByLabelText("Senha"), "123");
    await u.click(screen.getByRole("button", { name: /Criar conta/i }));
    expect(screen.getByLabelText("Nick")).toHaveFocus();
    expect(screen.getByText("Informe um nick.")).toBeInTheDocument();
    expect(screen.getByText("A senha deve ter pelo menos 8 caracteres.")).toBeInTheDocument();

    await u.type(screen.getByLabelText("Nick"), "T");
    expect(screen.queryByText("Informe um nick.")).not.toBeInTheDocument();
    expect(screen.getByText("A senha deve ter pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(screen.getByText("Confirme a senha.")).toBeInTheDocument();
  });

  it("navigates to login with the email after success", async () => {
    server.use(
      http.post(`${baseUrl}/auth/register`, () => HttpResponse.json({}, { status: 201 })),
    );
    renderWithProviders(
      <Routes>
        <Route path="/sign-up" element={<RegisterPage />} />
        <Route path="/" element={<LoginPage />} />
      </Routes>,
      { route: "/sign-up", token: null, user: null },
    );
    await fillAndSubmit();
    expect(await screen.findByText("Conta criada. Entre com seu e-mail e senha.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("teste@mail.com");
  });
});
