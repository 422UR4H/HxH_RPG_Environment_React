// src/pages/__tests__/LoginPage.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import LoginPage from "../LoginPage";
import { useLocation } from "react-router-dom";
import { markSessionExpired } from "../../features/auth/sessionNotice";
import { SERVER_WAKING_HINT } from "../../services/serverWake";

const baseUrl = "http://localhost:5000";

function StateProbe() {
  const { state } = useLocation();
  return <div data-testid="location-state">{JSON.stringify(state)}</div>;
}

function renderPage(state?: unknown) {
  return renderWithProviders(
    <>
      <LoginPage />
      <StateProbe />
    </>, { route: "/", token: null, user: null, state });
}

async function fillAndSubmit() {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("E-mail"), "teste@mail.com");
  await u.type(screen.getByLabelText("Senha"), "12345678");
  await u.click(screen.getByRole("button", { name: /Entrar/i }));
}

describe("LoginPage", () => {
  beforeEach(() => sessionStorage.clear());

  it("mostra mensagem amigável no 401, sem o texto cru do backend", async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ detail: "validation error: access denied" }, { status: 401 }),
      ),
    );
    renderPage();
    await fillAndSubmit();
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
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

  it("desabilita o botão e mostra o status Carregando enquanto o login está pendente", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`${baseUrl}/auth/login`, async () => {
        await gate;
        return HttpResponse.json({ detail: "validation error: access denied" }, { status: 401 });
      }),
    );
    renderPage();
    await fillAndSubmit();

    expect(await screen.findByRole("status", { name: "Carregando" })).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument();

    release();
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    expect(screen.queryByRole("status", { name: "Carregando" })).not.toBeInTheDocument();
  });

  it("shows field errors without calling the API", async () => {
    let called = false;
    server.use(
      http.post(`${baseUrl}/auth/login`, () => {
        called = true;
        return HttpResponse.json({}, { status: 200 });
      }),
    );
    renderPage();
    await userEvent.setup().click(screen.getByRole("button", { name: /Entrar/i }));
    expect(screen.getByText("Informe o e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe a senha.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
    expect(called).toBe(false);
  });

  it("keeps a single message for wrong credentials", async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ detail: "validation error: access denied" }, { status: 401 }),
      ),
    );
    renderPage();
    await fillAndSubmit();
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Senha")).not.toHaveAttribute("aria-invalid");
  });

  it("after sign-up, prefills the email and shows the notice", () => {
    renderPage({ registered: "novo@mail.com" });
    expect(screen.getByLabelText("E-mail")).toHaveValue("novo@mail.com");
    expect(screen.getByRole("status")).toHaveTextContent("Conta criada. Entre com seu e-mail e senha.");
  });

  it("consumes the sign-up notice", async () => {
    server.use(
      http.post(`${baseUrl}/auth/login`, () =>
        HttpResponse.json({ detail: "validation error: access denied" }, { status: 401 }),
      ),
    );
    const { rerender } = renderPage({ registered: "novo@mail.com" });
    expect(screen.getByRole("status")).toHaveTextContent("Conta criada.");
    // O estado foi apagado do histórico depois da primeira leitura.
    await waitFor(() => expect(screen.getByTestId("location-state")).toHaveTextContent("null"));
    // O e-mail preenchido continua; o aviso some ao tentar entrar.
    expect(screen.getByLabelText("E-mail")).toHaveValue("novo@mail.com");
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Senha"), "12345678");
    await u.click(screen.getByRole("button", { name: /Entrar/i }));
    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
    expect(screen.queryByText("Conta criada. Entre com seu e-mail e senha.")).not.toBeInTheDocument();
    rerender(
      <>
        <LoginPage />
        <StateProbe />
      </>,
    );
    expect(screen.queryByText("Conta criada. Entre com seu e-mail e senha.")).not.toBeInTheDocument();
  });

  it("shows the expired-session notice once", () => {
    markSessionExpired();
    const { unmount } = renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Sua sessão expirou. Entre de novo.");
    unmount();
    renderPage();
    expect(screen.queryByText("Sua sessão expirou. Entre de novo.")).not.toBeInTheDocument();
  });

  it("prefers the sign-up notice when both apply", () => {
    markSessionExpired();
    renderPage({ registered: "novo@mail.com" });
    expect(screen.getByRole("status")).toHaveTextContent("Conta criada.");
    expect(screen.queryByText("Sua sessão expirou. Entre de novo.")).not.toBeInTheDocument();
  });

  describe("waking hint", () => {
    afterEach(() => vi.useRealTimers());

    it("shows the waking hint after 3 s of pending login", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      server.use(http.post(`${baseUrl}/auth/login`, () => new Promise(() => {})));
      renderPage();
      const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await u.type(screen.getByLabelText("E-mail"), "teste@mail.com");
      await u.type(screen.getByLabelText("Senha"), "12345678");
      await u.click(screen.getByRole("button", { name: /Entrar/i }));
      expect(await screen.findByRole("status", { name: "Carregando" })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2900);
      });
      expect(screen.queryByText(SERVER_WAKING_HINT)).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText(SERVER_WAKING_HINT)).toBeInTheDocument();
    });
  });
});
