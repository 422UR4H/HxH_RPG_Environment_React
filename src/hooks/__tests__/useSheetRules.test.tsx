import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { renderWithProviders } from "../../test/render";
import { sheetRulesFixture } from "../../test/fixtures/rules";
import { useSheetRules } from "../useSheetRules";

function Probe() {
  const { data, isError } = useSheetRules();
  if (isError) return <p>erro</p>;
  return <p data-testid="out">{data ? JSON.stringify(data) : "carregando"}</p>;
}

describe("useSheetRules", () => {
  it("loads chapters from the public endpoint without a token", async () => {
    let authHeader: string | null = "unset";
    server.use(
      http.get("http://localhost:5000/rules/character-sheet", ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json({ chapters: sheetRulesFixture });
      }),
    );
    const { getByTestId } = renderWithProviders(<Probe />, { token: null });
    await waitFor(() =>
      expect(JSON.parse(getByTestId("out").textContent!)).toEqual(sheetRulesFixture),
    );
    expect(authHeader).toBeNull();
  });
});
