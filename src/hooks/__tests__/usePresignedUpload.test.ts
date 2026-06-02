import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { usePresignedUpload } from "../usePresignedUpload";

const baseUrl = "http://localhost:5000";

describe("usePresignedUpload", () => {
  it("getPresignedUrl calls the presigned-url endpoint with map_bg", async () => {
    server.use(
      http.post(`${baseUrl}/upload/presigned-url`, async ({ request }) => {
        const body = await request.json() as Record<string, string>;
        if (body.file_type === "map_bg" && body.map_uuid === "map-abc") {
          return HttpResponse.json({
            upload_url: "https://r2/put-url",
            public_url: "https://pub/img.webp",
          });
        }
        return HttpResponse.json({}, { status: 400 });
      }),
    );
    const { result } = renderHook(() => usePresignedUpload());
    const res = await result.current.getPresignedUrl("tok", "map-abc");
    expect(res.uploadUrl).toBe("https://r2/put-url");
    expect(res.publicUrl).toBe("https://pub/img.webp");
  });

  it("uploadToR2 performs a PUT request", async () => {
    let captured: Request | null = null;
    server.use(
      http.put("https://r2/put-url", async ({ request }) => {
        captured = request;
        return new HttpResponse(null, { status: 200 });
      }),
    );
    const { result } = renderHook(() => usePresignedUpload());
    await result.current.uploadToR2(
      "https://r2/put-url",
      new Blob(["data"], { type: "image/webp" }),
    );
    expect(captured).not.toBeNull();
    expect((captured as unknown as Request).method).toBe("PUT");
  });
});
