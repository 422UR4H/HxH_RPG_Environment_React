import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { rulesService } from "../rulesService";
import type { WeaponInfo } from "../../types/rules";

describe("rulesService.getWeapons", () => {
  it("hits GET /rules/weapons without auth and unwraps the weapons array", async () => {
    const weapons: WeaponInfo[] = [{ name: "Katana", dice: [4, 12], flatDamage: 7 }];
    let url = "";
    let authHeader: string | null = "unset";
    server.use(
      http.get("http://localhost:5000/rules/weapons", ({ request }) => {
        url = new URL(request.url).pathname;
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ weapons });
      }),
    );
    await expect(rulesService.getWeapons()).resolves.toEqual(weapons);
    expect(url).toBe("/rules/weapons");
    expect(authHeader).toBeNull();
  });
});
