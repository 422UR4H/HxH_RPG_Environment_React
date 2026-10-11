// src/pages/__tests__/HomePage.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import HomePage from "../HomePage";

function renderHome(opts: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>tela de login</div>} />
      <Route path="/home" element={<HomePage />} />
    </Routes>,
    { route: "/home", ...opts },
  );
}

describe("HomePage", () => {
  it("leva às fichas e às campanhas por links", () => {
    renderHome();
    expect(screen.getByRole("link", { name: /personagens/i })).toHaveAttribute(
      "href",
      "/charactersheets",
    );
    expect(screen.getByRole("link", { name: /campanhas/i })).toHaveAttribute(
      "href",
      "/campaigns",
    );
  });

  it("sair limpa a sessão e volta para o login", async () => {
    renderHome();
    await userEvent.click(screen.getByRole("button", { name: /sair/i }));

    expect(window.localStorage.getItem("token")).toBeNull();
    expect(window.localStorage.getItem("user")).toBeNull();
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("sem token, redireciona para o login", () => {
    renderHome({ token: null, user: null });
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });
});
