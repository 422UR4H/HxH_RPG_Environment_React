// src/pages/__tests__/RegisterPage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import RegisterPage from "../RegisterPage";

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<RegisterPage />, { route: "/sign-up", token: null, user: null });
}

async function fillAndSubmit() {
  const u = userEvent.setup();
  await u.type(screen.getByPlaceholderText("e-mail"), "teste@mail.com");
  await u.type(screen.getByPlaceholderText("nick"), "Tester");
  await u.type(screen.getByPlaceholderText("senha"), "12345678");
  await u.type(screen.getByPlaceholderText("confirme a senha"), "12345678");
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
});
