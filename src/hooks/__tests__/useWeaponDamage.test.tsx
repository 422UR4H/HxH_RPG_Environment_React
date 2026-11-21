import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { useWeaponDamage } from "../useWeaponDamage";

function Probe() {
  const damageOf = useWeaponDamage();
  return <p data-testid="out">{damageOf("Katana") ?? "sem dano"}</p>;
}

describe("useWeaponDamage", () => {
  it("has no damage while pending and a working lookup once loaded", async () => {
    server.use(
      http.get("http://localhost:5000/rules/weapons", () =>
        HttpResponse.json({ weapons: [{ name: "Katana", dice: [4, 12], flatDamage: 7 }] }),
      ),
    );
    const { getByTestId } = renderWithProviders(<Probe />, { token: null });
    expect(getByTestId("out").textContent).toBe("sem dano");
    await waitFor(() => expect(getByTestId("out").textContent).toBe("D12 + D4 +7"));
  });
});
