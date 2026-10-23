// src/pages/__tests__/LoginPage.test.tsx
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import LoginPage from "../LoginPage";

const baseUrl = "http://localhost:5000";

function renderPage() {
  return renderWithProviders(<LoginPage />, { route: "/", token: null, user: null });
}

async function fillAndSubmit() {
  const u = userEvent.setup();
  await u.type(screen.getByPlaceholderText("e-mail"), "teste@mail.com");
  await u.type(screen.getByPlaceholderText("password"), "12345678");
  await u.click(screen.getByRole("button", { name: /Log In/i }));
}

describe("LoginPage", () => {
  it("mostra mensagem amigável no 401, sem o texto cru do backend", async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ detail: "validation error: access denied" }, { status: 401 }),
      ),
    );
    renderPage();
    await fillAndSubmit();
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("mostra mensagem de conexão quando a rede falha", async () => {
    server.use(http.post(`${baseUrl}/auth/login`, () => HttpResponse.error()));
    renderPage();
    await fillAndSubmit();
    expect(
      await screen.findByText(
        "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.",
      ),
    ).toBeInTheDocument();
  });
});
