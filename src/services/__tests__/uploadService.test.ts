// src/services/__tests__/uploadService.test.ts
//
// Basic I/O coverage for uploadService.ts. Per the Fase 7 plan, this service
// "não passa por conversão — cobrir só o básico": the backend now speaks
// genuine camelCase end-to-end, so this service is a clean passthrough
// (no case conversion, no manual field renaming). This file locks down
// request shape, response passthrough, and auth header where applicable.
import { describe, it, expect, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/server";
import { uploadService } from "../uploadService";

const baseUrl = "http://localhost:5000";
const token = "test-token";

describe("uploadService", () => {
  describe("getPresignedUrl", () => {
    it("POSTs to /upload/presigned-url with a camelCase body and Authorization header", async () => {
      let capturedUrl = "";
      let capturedAuth: string | null = null;
      let capturedBody: unknown;
      server.use(
        http.post(`${baseUrl}/upload/presigned-url`, async ({ request }) => {
          capturedUrl = request.url;
          capturedAuth = request.headers.get("authorization");
          capturedBody = await request.json();
          return HttpResponse.json({
            uploadUrl: "https://r2.example.com/upload?sig=abc",
            publicUrl: "https://r2.example.com/public/avatar.webp",
          });
        }),
      );

      await uploadService.getPresignedUrl(token, "avatar", "sheet-1");

      expect(capturedUrl).toBe(`${baseUrl}/upload/presigned-url`);
      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        fileType: "avatar",
        sheetUuid: "sheet-1",
      });
    });

    it("passes uploadUrl/publicUrl through unchanged", async () => {
      server.use(
        http.post(`${baseUrl}/upload/presigned-url`, () =>
          HttpResponse.json({
            uploadUrl: "https://r2.example.com/upload?sig=abc",
            publicUrl: "https://r2.example.com/public/avatar.webp",
          }),
        ),
      );

      const result = await uploadService.getPresignedUrl(token, "cover", "sheet-1");

      expect(result).toEqual({
        uploadUrl: "https://r2.example.com/upload?sig=abc",
        publicUrl: "https://r2.example.com/public/avatar.webp",
      });
    });
  });

  describe("getPresignedUrlForMap", () => {
    it("POSTs to /upload/presigned-url with fileType 'map_bg' and mapUuid, and Authorization header", async () => {
      let capturedAuth: string | null = null;
      let capturedBody: unknown;
      server.use(
        http.post(`${baseUrl}/upload/presigned-url`, async ({ request }) => {
          capturedAuth = request.headers.get("authorization");
          capturedBody = await request.json();
          return HttpResponse.json({
            uploadUrl: "https://r2.example.com/upload?sig=map",
            publicUrl: "https://r2.example.com/public/map.webp",
          });
        }),
      );

      await uploadService.getPresignedUrlForMap(token, "map-1");

      expect(capturedAuth).toBe(`Bearer ${token}`);
      expect(capturedBody).toEqual({
        fileType: "map_bg",
        mapUuid: "map-1",
      });
    });

    it("passes uploadUrl/publicUrl through unchanged", async () => {
      server.use(
        http.post(`${baseUrl}/upload/presigned-url`, () =>
          HttpResponse.json({
            uploadUrl: "https://r2.example.com/upload?sig=map",
            publicUrl: "https://r2.example.com/public/map.webp",
          }),
        ),
      );

      const result = await uploadService.getPresignedUrlForMap(token, "map-1");

      expect(result).toEqual({
        uploadUrl: "https://r2.example.com/upload?sig=map",
        publicUrl: "https://r2.example.com/public/map.webp",
      });
    });
  });

  // uploadToR2 bypasses httpClient entirely — it's a raw `fetch` PUT
  // straight to the presigned URL (no base URL prefix, no Authorization
  // header, since R2 auth lives in the presigned URL's query string).
  // MSW's Node server intercepts global `fetch` the same way it intercepts
  // XHR/http, so this is covered with the same `server.use(...)` pattern —
  // no need to mock `global.fetch` by hand.
  describe("uploadToR2", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("PUTs the blob directly to the presigned URL with an image/webp content type, no auth header", async () => {
      const presignedUrl = "https://r2.example.com/upload?sig=abc123";
      let capturedUrl = "";
      let capturedMethod = "";
      let capturedContentType: string | null = null;
      let capturedAuth: string | null = null;
      server.use(
        http.put(presignedUrl, ({ request }) => {
          capturedUrl = request.url;
          capturedMethod = request.method;
          capturedContentType = request.headers.get("content-type");
          capturedAuth = request.headers.get("authorization");
          return new HttpResponse(null, { status: 200 });
        }),
      );

      const blob = new Blob(["fake-image-bytes"], { type: "image/webp" });
      await uploadService.uploadToR2(presignedUrl, blob);

      expect(capturedUrl).toBe(presignedUrl);
      expect(capturedMethod).toBe("PUT");
      expect(capturedContentType).toBe("image/webp");
      expect(capturedAuth).toBeNull();
    });

    it("resolves (void) on a 2xx response", async () => {
      const presignedUrl = "https://r2.example.com/upload?sig=ok";
      server.use(
        http.put(presignedUrl, () => new HttpResponse(null, { status: 200 })),
      );

      await expect(
        uploadService.uploadToR2(presignedUrl, new Blob(["x"])),
      ).resolves.toBeUndefined();
    });

    it("throws with the status code when the upload fails", async () => {
      const presignedUrl = "https://r2.example.com/upload?sig=expired";
      server.use(
        http.put(presignedUrl, () => new HttpResponse(null, { status: 403 })),
      );

      await expect(
        uploadService.uploadToR2(presignedUrl, new Blob(["x"])),
      ).rejects.toThrow("R2 upload failed: 403");
    });
  });
});
