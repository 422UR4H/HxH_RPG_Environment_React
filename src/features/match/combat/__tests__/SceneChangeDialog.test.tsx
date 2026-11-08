import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SceneChangeDialog from "../SceneChangeDialog";
import type { CombatSummary } from "../../clock/clockMessages";
import type { WsError } from "../combatErrorMessages";

const NAMES: Record<string, string> = { gon: "Gon", killua: "Killua", hisoka: "Hisoka" };
const nameOf = (id: string) => NAMES[id] ?? id;

const SUMMARY: CombatSummary = {
  sceneId: "s1",
  countedRounds: 12,
  countedSeconds: 12,
  activeRoundCounts: true,
  minimumStoryAt: "2000-01-01T08:30:13",
  hiatuses: [
    {
      before: { roundNumber: 4, turnId: "t1", actorId: "gon", actionKind: "attack" },
      after: { roundNumber: 5, turnId: "t2", actorId: "hisoka", actionKind: "move" },
    },
  ],
};

type Props = Parameters<typeof SceneChangeDialog>[0];

function setup(over: Partial<Props> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const props: Props = {
    open: true,
    currentCategory: "roleplay",
    summary: null,
    summaryFailed: false,
    nameOf,
    error: null,
    onConfirm,
    onCancel,
    ...over,
  };
  const view = render(<SceneChangeDialog {...props} />);
  return { onConfirm, onCancel, user: userEvent.setup(), rerender: (p: Partial<Props>) => view.rerender(<SceneChangeDialog {...props} {...p} />) };
}

const finalDesc = () => screen.getByLabelText(/Descrição final/) as HTMLTextAreaElement;

describe("SceneChangeDialog", () => {
  it("roleplay shows only the optional final description, no summary or clock", () => {
    setup();
    expect(screen.getByRole("heading", { level: 2, name: "Nova cena" })).toBeInTheDocument();
    expect(finalDesc()).toBeInTheDocument();
    expect(screen.getByText("(opcional)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Horas")).not.toBeInTheDocument();
    expect(screen.queryByText(/rounds? disputados?/)).not.toBeInTheDocument();
    expect(screen.getByText("Cena atual")).toBeInTheDocument();
    expect(screen.getByText("Nova cena", { selector: "h3" })).toBeInTheDocument();
  });

  it("counts the final description and caps it at 255", () => {
    setup();
    fireEvent.change(finalDesc(), { target: { value: "a".repeat(120) } });
    expect(screen.getByText("120/255")).toBeInTheDocument();
    expect(finalDesc().maxLength).toBe(255);
  });

  it("roleplay submit sends the trimmed final description and no storyAt", async () => {
    const { onConfirm, user } = setup();
    fireEvent.change(finalDesc(), { target: { value: "  Fim da conversa.  " } });
    fireEvent.change(screen.getByLabelText("Descrição inicial"), { target: { value: " Na torre " } });
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(onConfirm).toHaveBeenCalledWith({
      category: "battle",
      briefInitialDescription: "Na torre",
      briefFinalDescription: "Fim da conversa.",
    });
  });

  it("omits an empty final description", async () => {
    const { onConfirm, user } = setup();
    fireEvent.change(finalDesc(), { target: { value: "   " } });
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty("briefFinalDescription");
    expect(onConfirm.mock.calls[0][0]).not.toHaveProperty("storyAt");
  });

  it("battle shows the loading line until the summary arrives", () => {
    const { rerender } = setup({ currentCategory: "battle" });
    expect(screen.getByRole("heading", { name: "Encerrar combate e trocar de cena" })).toBeInTheDocument();
    expect(screen.getByText("Calculando o combate…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Horas")).not.toBeInTheDocument();
    rerender({ summary: SUMMARY });
    expect(screen.queryByText("Calculando o combate…")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Horas")).toBeInTheDocument();
  });

  it("battle shows the summary and the editor starting at the minimum", () => {
    setup({ currentCategory: "battle", summary: SUMMARY });
    expect(screen.getByText("12 rounds disputados = 12 s, já no relógio")).toBeInTheDocument();
    expect(screen.getByText("+1 s ao encerrar")).toBeInTheDocument();
    expect((screen.getByLabelText("Horas") as HTMLInputElement).value).toBe("08");
    expect((screen.getByLabelText("Minutos") as HTMLInputElement).value).toBe("30");
    expect((screen.getByLabelText("Segundos") as HTMLInputElement).value).toBe("13");
  });

  it("battle without an active counted round omits the +1 s line", () => {
    setup({ currentCategory: "battle", summary: { ...SUMMARY, activeRoundCounts: false, countedRounds: 1, countedSeconds: 1 } });
    expect(screen.getByText("1 round disputado = 1 s, já no relógio")).toBeInTheDocument();
    expect(screen.queryByText("+1 s ao encerrar")).not.toBeInTheDocument();
  });

  it("lists each hiatus with names and action labels, plus the owner's message", () => {
    setup({ currentCategory: "battle", summary: SUMMARY });
    expect(
      screen.getByText("Hiato 1: depois do round 4 (Gon — ataque) e antes do round 5 (Hisoka — movimento)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Nesses intervalos ninguém disputou ações — os personagens podem ter conversado, se reposicionado ou procurado uma brecha. Some ao relógio o tempo que eles duraram.",
      ),
    ).toBeInTheDocument();
  });

  it("an empty hiatus list says the combat was continuous", () => {
    setup({ currentCategory: "battle", summary: { ...SUMMARY, hiatuses: [] } });
    expect(screen.getByText("Nenhum hiato: o combate foi contínuo.")).toBeInTheDocument();
    expect(screen.queryByText(/Nesses intervalos/)).not.toBeInTheDocument();
  });

  it("battle submit at the minimum sends storyAt and confirmLongSkip false", async () => {
    const { onConfirm, user } = setup({ currentCategory: "battle", summary: SUMMARY });
    fireEvent.change(finalDesc(), { target: { value: " Hisoka fugiu. " } });
    await user.click(screen.getByRole("radio", { name: "Roleplay" }));
    await user.click(screen.getByRole("button", { name: "Encerrar combate e trocar de cena" }));
    expect(onConfirm).toHaveBeenCalledWith({
      category: "roleplay",
      briefInitialDescription: "",
      briefFinalDescription: "Hisoka fugiu.",
      storyAt: "2000-01-01T08:30:13",
      confirmLongSkip: false,
    });
  });

  it("battle submit after a long skip sends confirmLongSkip true once confirmed", async () => {
    const { onConfirm, user } = setup({ currentCategory: "battle", summary: SUMMARY });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Próximo dia" }));
    await user.click(screen.getByRole("button", { name: "Encerrar combate e trocar de cena" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Avançar" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ storyAt: "2000-01-04T08:30:13", confirmLongSkip: true }),
    );
  });

  it("falls back to the roleplay layout when the summary fails", () => {
    setup({ currentCategory: "battle", summaryFailed: true });
    expect(screen.queryByText("Calculando o combate…")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Horas")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar de cena" })).toBeInTheDocument();
  });

  it("shows a change_scene error inline and clears it on resubmit", async () => {
    const error: WsError = { code: "clock_below_limit", message: "x", sentType: "change_scene", at: 1 };
    const { user, rerender, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    rerender({ error });
    expect(screen.getByRole("alert")).toHaveTextContent("Não dá para voltar antes do limite do relógio.");
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("allows a retry when the send did not leave the socket", async () => {
    const { user, onConfirm } = setup();
    onConfirm.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("ignores a second click while the change is pending", async () => {
    const { user, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Trocar de cena" }));
    await user.click(screen.getByRole("button", { name: /Trocando|Trocar de cena/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
