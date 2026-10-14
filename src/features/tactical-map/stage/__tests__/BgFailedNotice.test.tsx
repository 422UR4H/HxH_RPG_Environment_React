import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BgFailedNotice from "../BgFailedNotice";

describe("BgFailedNotice", () => {
  it("mostra o aviso e o botão chama onRetry", async () => {
    const onRetry = vi.fn();
    render(<BgFailedNotice onRetry={onRetry} />);
    expect(screen.getByText("Não foi possível carregar a imagem de fundo. O mapa funciona normalmente sem ela.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
