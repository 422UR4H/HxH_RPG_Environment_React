import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, getConfig, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse, delay } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import { server } from "../../test/server";
import { fakeJwt } from "../../test/fakeJwt";
import { userFixture } from "../../test/fixtures/user";
import { sheetSummaryApiFixture } from "../../test/fixtures/sheet";
import { pickComboboxOption } from "../../test/pickCombobox";
import { renderWithProviders } from "../../test/render";
import { TokenProvider } from "../../contexts/TokenContext";
import { UserProvider } from "../../contexts/UserContext";
import { NavGuardProvider } from "../../contexts/NavGuardContext";
import CharacterSheetsPage from "../CharacterSheetsPage";
import CreateCharacterSheetPage from "../CreateCharacterSheetPage";
import CharacterSheetTemplate from "../../features/sheet/CharacterSheetTemplate";
import { MATCH_SHEET_MODE } from "../../features/sheet/types/sheetMode";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import type { CharacterClass } from "../../types/characterClass";

const baseUrl = "http://localhost:5000";
const HELP = "Regras de atributos e perícias";

// Classe sem `definition` (sem prévia): o nível físico vem da própria classe — 2 pontos.
const classFixture: CharacterClass = {
  profile: { name: "Classe Regras", alignment: "Neutral-Neutral", description: "", briefDescription: "" },
  skills: {},
  jointSkills: {},
  proficiencies: {},
  jointProficiencies: [],
  attributes: {},
  abilities: { physicals: { exp: 0, level: 2, bonus: 0 } },
  indicatedCategories: [],
};

function listSheets(sheets: unknown[]) {
  server.use(http.get(`${baseUrl}/charactersheets`, () => HttpResponse.json({ characterSheets: sheets })));
}

let navigateRef: NavigateFunction;
function Probe() {
  const location = useLocation();
  navigateRef = useNavigate();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}
// A primeira montagem da ficha com o painel é lenta no jsdom (frio, e com a suíte em paralelo):
// a troca de URL é uma transição, que cede a vez e passa do 1 s padrão das buscas.
const defaultAsyncTimeout = getConfig().asyncUtilTimeout;
beforeAll(() => configure({ asyncUtilTimeout: 10_000 }));
afterAll(() => configure({ asyncUtilTimeout: defaultAsyncTimeout }));
const where = () => screen.getByTestId("location").textContent;
const back = () => act(() => void navigateRef(-1));

/** O app de verdade num histórico em memória: a lista redireciona para a criação quando vazia. */
function renderApp(initialEntries: string[]) {
  window.localStorage.setItem("token", JSON.stringify({ token: fakeJwt() }));
  window.localStorage.setItem("user", JSON.stringify(userFixture));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <NavGuardProvider>
        <TokenProvider>
          <UserProvider>
            <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
              <Probe />
              <Routes>
                <Route path="/home" element={<p>Início</p>} />
                <Route path="/charactersheets" element={<CharacterSheetsPage />} />
                <Route path="/charactersheet/new" element={<CreateCharacterSheetPage />} />
              </Routes>
            </MemoryRouter>
          </UserProvider>
        </TokenProvider>
      </NavGuardProvider>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

const panel = () => screen.queryByRole("dialog", { name: /Regras/ });
const helpButton = () => screen.findByRole("button", { name: HELP });

/**
 * Prova que o painel não abriu sozinho. A troca de URL é uma transição (~200 ms aqui quando a
 * guarda deixa passar), então uma pausa curta não pegaria a abertura: espera com folga.
 */
async function expectNoAutoOpen() {
  await expect(waitFor(() => expect(where()).toContain("regras"), { timeout: 1500 })).rejects.toThrow();
  expect(where()).toBe("/charactersheet/new");
  expect(panel()).toBeNull();
}

const resPoints = () => {
  const label = screen.getByText("RES");
  return label.nextElementSibling?.children[1]?.textContent;
};

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  server.use(http.get(`${baseUrl}/classes`, () => HttpResponse.json({ characterClasses: [classFixture] })));
});

afterEach(() => {
  document.body.style.overflow = "";
});

describe("CreateCharacterSheetPage — rules panel", { timeout: 20_000 }, () => {
  it("auto-opens at Criação when the sheet list is empty", async () => {
    listSheets([]);
    renderApp(["/home", "/charactersheet/new"]);

    await waitFor(() => expect(where()).toBe("/charactersheet/new?regras=criacao"));
    expect(await screen.findByRole("dialog", { name: /Regras/ })).toBeInTheDocument();
  });

  it("does not auto-open while the list is pending or on error", async () => {
    server.use(
      http.get(`${baseUrl}/charactersheets`, async () => {
        await delay("infinite");
        return HttpResponse.json({ characterSheets: [] });
      }),
    );
    const pending = renderApp(["/home", "/charactersheet/new"]);
    await helpButton();
    await expectNoAutoOpen();
    pending.unmount();

    // O hook pede `retry: 1` (vence o `retry: false` do cliente): só a 2ª falha assenta o erro.
    let listCalls = 0;
    server.use(
      http.get(`${baseUrl}/charactersheets`, () => {
        listCalls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const { queryClient } = renderApp(["/home", "/charactersheet/new"]);
    await helpButton();
    await waitFor(() => {
      expect(listCalls).toBe(2);
      const [list] = queryClient.getQueryCache().findAll({ queryKey: ["characterSheets"] });
      expect(list?.state.status).toBe("error");
      expect(list?.state.fetchStatus).toBe("idle");
    });
    await expectNoAutoOpen();
  });

  it("does not auto-open when the player already has sheets", async () => {
    listSheets([sheetSummaryApiFixture]);
    renderApp(["/home", "/charactersheet/new"]);
    await helpButton();
    await expectNoAutoOpen();
  });

  it("closes the auto-opened panel on browser back without leaving the page", async () => {
    listSheets([]);
    // A lista vazia redireciona (replace) para a criação, que abre o painel sozinha.
    renderApp(["/home", "/charactersheets"]);
    await waitFor(() => expect(where()).toBe("/charactersheet/new?regras=criacao"));
    expect(await screen.findByRole("dialog", { name: /Regras/ })).toBeInTheDocument();

    back();
    expect(where()).toBe("/charactersheet/new");
    expect(panel()).toBeNull();
    expect(await helpButton()).toBeInTheDocument();
    // Abre uma vez por montagem: o voltar não a reabre.
    await new Promise((r) => setTimeout(r, 50));
    expect(where()).toBe("/charactersheet/new");
  });

  it("keeps distributed points across open, close and back", async () => {
    listSheets([sheetSummaryApiFixture]);
    renderApp(["/home", "/charactersheet/new"]);
    const u = userEvent.setup();
    await pickComboboxOption(await screen.findByRole("combobox", { name: "Classe" }), classFixture.profile.name);
    await u.type(screen.getByPlaceholderText("Nickname"), "Hau");

    // O ícone da câmera do cabeçalho também tem alt "+", mas fica dentro de um <button>.
    const resPlus = () => screen.getAllByAltText("+").filter((img) => !img.closest("button"))[0];
    await u.click(resPlus());
    await u.click(resPlus());
    expect(resPoints()).toBe("2");

    await u.click(await helpButton());
    expect(panel()).not.toBeNull();
    await u.click(screen.getByRole("button", { name: "Fechar regras" }));
    expect(panel()).toBeNull();
    expect(resPoints()).toBe("2");

    await u.click(await helpButton());
    expect(panel()).not.toBeNull();
    back();
    expect(panel()).toBeNull();
    expect(where()).toBe("/charactersheet/new");

    expect(resPoints()).toBe("2");
    expect(screen.getByPlaceholderText("Nickname")).toHaveValue("Hau");
  });

  it('the "?" opens at Atributos and its tooltip reads "Fechar regras" while open', async () => {
    listSheets([sheetSummaryApiFixture]);
    renderApp(["/home", "/charactersheet/new"]);
    const u = userEvent.setup();
    const button = await helpButton();
    expect(button).toHaveAccessibleDescription("Regras");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await u.click(button);
    expect(where()).toBe("/charactersheet/new?regras=atributos");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAccessibleDescription("Fechar regras");
    expect(button).toHaveAttribute("aria-controls", screen.getByRole("dialog", { name: /Regras/ }).id);
  });

  it('returns focus to the "?" after closing', async () => {
    listSheets([sheetSummaryApiFixture]);
    renderApp(["/home", "/charactersheet/new"]);
    const u = userEvent.setup();
    const button = await helpButton();

    await u.click(button);
    await u.click(screen.getByRole("button", { name: "Fechar regras" }));
    expect(button).toHaveFocus();

    await u.click(button);
    await u.keyboard("{Escape}");
    expect(panel()).toBeNull();
    expect(button).toHaveFocus();

    await u.click(button);
    back();
    expect(panel()).toBeNull();
    expect(button).toHaveFocus();
  });

  it('renders no "?" in the embedded match sheet', async () => {
    renderWithProviders(
      <CharacterSheetTemplate
        sheetMode={MATCH_SHEET_MODE}
        data={{ charSheet: createEmptyCharacterSheet(), isLoading: false, error: null }}
      />,
      { route: "/game/1?regras=atributos" },
    );
    expect(await screen.findByText("ATRIBUTOS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: HELP })).toBeNull();
    expect(panel()).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});
