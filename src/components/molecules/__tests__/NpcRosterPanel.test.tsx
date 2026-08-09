import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../../../test/render";
import NpcRosterPanel from "../NpcRosterPanel";
import {
  npcFixture,
  npc2Fixture,
  playerSheetFixture,
  campaignWithNpcsApi,
  npcListFixture,
} from "../../../test/fixtures/campaign";
import { server } from "../../../test/server";

const noop = vi.fn();
const baseProps = {
  campaignId: "campaign-1",
  placedCharacterIds: new Set<string>(),
  placingNpcId: null,
  isDropTarget: false,
  onPointerDownNpc: noop,
};

beforeEach(() => {
  server.use(
    http.get("http://localhost:5000/campaigns/:id", () =>
      HttpResponse.json({
        campaign: campaignWithNpcsApi([npcFixture, npc2Fixture], [playerSheetFixture]),
      }),
    ),
  );
});

describe("NpcRosterPanel — lista", () => {
  it("exibe apenas NPCs (não jogadores)", async () => {
    renderWithProviders(<NpcRosterPanel {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("Soldado Zoldyck")).toBeInTheDocument();
      expect(screen.getByText("Guarda Kiriko")).toBeInTheDocument();
    });
    expect(screen.queryByText("Gon Freecss")).not.toBeInTheDocument();
  });

  it("não exibe NPCs já colocados no campo", async () => {
    renderWithProviders(
      <NpcRosterPanel
        {...baseProps}
        placedCharacterIds={new Set(["npc-1"])}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Guarda Kiriko")).toBeInTheDocument();
    });
    expect(screen.queryByText("Soldado Zoldyck")).not.toBeInTheDocument();
  });

  it("não exibe campo de busca com poucos personagens", async () => {
    renderWithProviders(<NpcRosterPanel {...baseProps} />);
    await waitFor(() => screen.getByText("Soldado Zoldyck"));
    expect(screen.queryByPlaceholderText(/buscar/i)).not.toBeInTheDocument();
  });

  it("campo de busca filtra por nickName (case-insensitive)", async () => {
    const user = userEvent.setup();
    // Acima de 15 personagens o painel passa a renderizar o campo de busca.
    const many = npcListFixture(16);
    server.use(
      http.get("http://localhost:5000/campaigns/:id", () =>
        HttpResponse.json({ campaign: campaignWithNpcsApi(many) }),
      ),
    );
    renderWithProviders(<NpcRosterPanel {...baseProps} />);
    await waitFor(() => screen.getByText("NPC Alfa 01"));

    await user.type(screen.getByPlaceholderText(/buscar/i), "alfa 07");

    expect(screen.getByText("NPC Alfa 07")).toBeInTheDocument();
    expect(screen.queryByText("NPC Alfa 01")).not.toBeInTheDocument();
  });

  it("dispara onPointerDownNpc ao pressionar card do NPC", async () => {
    const onPointerDownNpc = vi.fn();
    renderWithProviders(
      <NpcRosterPanel {...baseProps} onPointerDownNpc={onPointerDownNpc} />,
    );
    await waitFor(() => screen.getByText("Soldado Zoldyck"));
    const card = screen.getByTestId("npc-card-npc-1");
    card.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(onPointerDownNpc).toHaveBeenCalledWith(
      npcFixture,
      expect.any(Object),
    );
  });

  it("isDropTarget adiciona borda laranja na área", async () => {
    renderWithProviders(<NpcRosterPanel {...baseProps} isDropTarget={true} />);
    await waitFor(() => screen.getByText("Soldado Zoldyck"));
    expect(screen.getByTestId("npc-roster-drop-zone")).toHaveAttribute(
      "data-drop-target",
      "true",
    );
  });

  it("oculta o card do NPC que está sendo colocado no campo", async () => {
    server.use(
      http.get("http://localhost:5000/campaigns/:id", () =>
        HttpResponse.json({ campaign: campaignWithNpcsApi([npcFixture, npc2Fixture]) })
      )
    );
    renderWithProviders(
      <NpcRosterPanel
        {...baseProps}
        placingNpcId={npcFixture.uuid}
      />
    );
    await screen.findByTestId(`npc-card-${npc2Fixture.uuid}`);
    expect(screen.queryByTestId(`npc-card-${npcFixture.uuid}`)).toBeNull();
  });
});
