// src/pages/__tests__/CreateCharacterSheetPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import type { CharacterClass } from "../../types/characterClass";
import CreateCharacterSheetPage from "../CreateCharacterSheetPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Driving the real avatar picker (file input → react-advanced-cropper canvas →
// browser-image-compression) needs a working <canvas> that jsdom doesn't provide —
// ImagePickerModal.test.tsx avoids that path for the same reason. We only need a
// Blob to exist so CreateCharacterSheetPage's upload branch runs, so the mock
// skips straight to onConfirm with a fixed Blob.
vi.mock("../../components/molecules/ImagePickerModal", () => ({
  default: ({
    onConfirm,
  }: {
    onConfirm: (blob: Blob | null, url: string | null) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onConfirm(new Blob(["fake-avatar-bytes"], { type: "image/webp" }), null)
      }
    >
      mock-confirmar-imagem
    </button>
  ),
}));

const baseUrl = "http://localhost:5000";

const sheetClassFixture: CharacterClass = {
  profile: {
    name: "Classe Ficha Teste",
    alignment: "Neutral-Neutral",
    description: "",
    briefDescription: "",
  },
  skills: {},
  jointSkills: {},
  proficiencies: {},
  jointProficiencies: [],
  attributes: {},
  abilities: {},
  indicatedCategories: [],
};

function renderPage() {
  return renderWithProviders(<CreateCharacterSheetPage />, {
    route: "/charactersheet/new",
    path: "/charactersheet/new",
  });
}

async function fillRequiredFields() {
  await userEvent.type(await screen.findByPlaceholderText("Nickname"), "Hau");
  await userEvent.type(
    screen.getByPlaceholderText("Nome completo do personagem"),
    "Haualu Teste",
  );
  const classSelect = screen
    .getByText(sheetClassFixture.profile.name)
    .closest("select")!;
  await userEvent.selectOptions(classSelect, sheetClassFixture.profile.name);
}

async function selectAvatar() {
  const avatarContainer = screen.getByAltText("avatar").parentElement!;
  await userEvent.click(within(avatarContainer).getByRole("button"));
  await userEvent.click(screen.getByText("mock-confirmar-imagem"));
}

describe("CreateCharacterSheetPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    server.use(
      http.get(`${baseUrl}/classes`, () =>
        HttpResponse.json({ characterClasses: [sheetClassFixture] }),
      ),
    );
  });

  it(
    "retry depois de criar a ficha não cria outra: reenvia só a imagem com o mesmo uuid e navega",
    async () => {
      let createCount = 0;
      server.use(
        http.post(`${baseUrl}/charactersheets`, () => {
          createCount += 1;
          return HttpResponse.json(
            { characterSheet: { uuid: "sheet-uuid-1" } },
            { status: 201 },
          );
        }),
      );

      let presignedCallCount = 0;
      server.use(
        http.post(`${baseUrl}/upload/presigned-url`, () => {
          presignedCallCount += 1;
          if (presignedCallCount === 1) {
            return HttpResponse.json({ detail: "r2_unavailable" }, { status: 500 });
          }
          return HttpResponse.json({
            uploadUrl: "https://r2.example.com/upload?sig=retry",
            publicUrl: "https://r2.example.com/public/avatar.webp",
          });
        }),
      );
      server.use(
        http.put("https://r2.example.com/upload?sig=retry", () =>
          new HttpResponse(null, { status: 200 }),
        ),
      );
      server.use(
        http.patch(`${baseUrl}/charactersheets/:uuid/profile`, () =>
          new HttpResponse(null, { status: 200 }),
        ),
      );

      renderPage();
      await fillRequiredFields();
      await selectAvatar();

      // 1st attempt: sheet is created, but the presigned-url call fails.
      // The page swaps the whole form for a loading placeholder while
      // isSubmitting is true, so the submit button is a fresh DOM node after
      // each attempt — re-query it each time rather than caching a reference.
      await userEvent.click(
        screen.getByRole("button", { name: /Criar Ficha/i }),
      );
      expect(
        await screen.findByText(
          /A ficha já foi criada com os dados enviados\. Tentar de novo envia só as imagens; para mudar outros campos, edite a ficha depois\./i,
        ),
      ).toBeInTheDocument();
      expect(createCount).toBe(1);
      expect(mockNavigate).not.toHaveBeenCalled();

      // 2nd attempt (retry): must NOT create another sheet, only redo the upload
      // against the uuid already created, then navigate like the happy path.
      await userEvent.click(
        screen.getByRole("button", { name: /Criar Ficha/i }),
      );
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/charactersheet/sheet-uuid-1", {
          replace: true,
        });
      });
      expect(createCount).toBe(1);
      expect(presignedCallCount).toBe(2);
    },
    // Two full submit round-trips (fill form, pick avatar, create, fail,
    // retry, upload, patch, navigate) through real component re-renders —
    // comfortably under 5s alone, but the default testTimeout gets tight
    // under full-suite CPU contention (seen flaky at 5000ms in that mode).
    15000,
  );

  it(
    "antes de criar, erro genérico não menciona a ficha já ter sido criada",
    async () => {
      server.use(
        http.post(`${baseUrl}/charactersheets`, () =>
          HttpResponse.json({ detail: "unexpected_error" }, { status: 500 }),
        ),
      );

      renderPage();
      await fillRequiredFields();

      await userEvent.click(screen.getByRole("button", { name: /Criar Ficha/i }));

      expect(
        await screen.findByText(/Erro ao salvar a ficha\. Tente novamente\./i),
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    },
    10000,
  );
});
