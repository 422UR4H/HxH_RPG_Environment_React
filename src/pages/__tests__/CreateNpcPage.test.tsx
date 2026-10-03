// src/pages/__tests__/CreateNpcPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { masterUserFixture } from "../../test/fixtures/user";
import type { CharacterClass } from "../../types/characterClass";
import CreateNpcPage from "../CreateNpcPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Driving the real avatar picker (file input → react-advanced-cropper canvas →
// browser-image-compression) needs a working <canvas> that jsdom doesn't provide —
// ImagePickerModal.test.tsx avoids that path for the same reason. We only need a
// Blob to exist so CreateNpcPage's upload branch runs, so the mock skips straight
// to onConfirm with a fixed Blob.
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

const npcClassFixture: CharacterClass = {
  profile: {
    name: "Classe NPC Teste",
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
  return renderWithProviders(<CreateNpcPage />, {
    route: "/campaigns/campaign-1/npcs/new",
    path: "/campaigns/:campaignId/npcs/new",
    user: masterUserFixture,
  });
}

async function fillRequiredFields() {
  await userEvent.type(await screen.findByPlaceholderText("Nickname"), "Hau");
  await userEvent.type(
    screen.getByPlaceholderText("Nome completo do personagem"),
    "Haualu Teste",
  );
  const classSelect = screen
    .getByText(npcClassFixture.profile.name)
    .closest("select")!;
  await userEvent.selectOptions(classSelect, npcClassFixture.profile.name);
}

async function selectAvatar() {
  const avatarContainer = screen.getByAltText("avatar").parentElement!;
  await userEvent.click(within(avatarContainer).getByRole("button"));
  await userEvent.click(screen.getByText("mock-confirmar-imagem"));
}

describe("CreateNpcPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    server.use(
      http.get(`${baseUrl}/classes`, () =>
        HttpResponse.json({ characterClasses: [npcClassFixture] }),
      ),
    );
  });

  it(
    "retry depois de criar o NPC não cria outro: reenvia só a imagem com o mesmo uuid e navega",
    async () => {
      let createCount = 0;
      server.use(
        http.post(`${baseUrl}/charactersheets`, () => {
          createCount += 1;
          return HttpResponse.json(
            { characterSheet: { uuid: "npc-uuid-1" } },
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
      await userEvent.click(screen.getByRole("button", { name: /Criar NPC/i }));
      expect(
        await screen.findByText(
          /O NPC já foi criado com os dados enviados\. Tentar de novo envia só as imagens; para mudar outros campos, edite a ficha depois\./i,
        ),
      ).toBeInTheDocument();
      expect(createCount).toBe(1);
      expect(mockNavigate).not.toHaveBeenCalled();

      // 2nd attempt (retry): must NOT create another sheet, only redo the upload
      // against the uuid already created, then navigate like the happy path.
      await userEvent.click(screen.getByRole("button", { name: /Criar NPC/i }));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/campaigns/campaign-1", {
          replace: true,
        });
      });
      expect(createCount).toBe(1);
      expect(presignedCallCount).toBe(2);
    },
  );

  it(
    "antes de criar, erro genérico não menciona o NPC já ter sido criado",
    async () => {
      server.use(
        http.post(`${baseUrl}/charactersheets`, () =>
          HttpResponse.json({ detail: "unexpected_error" }, { status: 500 }),
        ),
      );

      renderPage();
      await fillRequiredFields();

      await userEvent.click(screen.getByRole("button", { name: /Criar NPC/i }));

      expect(
        await screen.findByText(/Erro ao salvar o NPC\. Tente novamente\./i),
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    },
  );
});
