// src/services/uploadService.ts
import { httpClient } from "./httpClient";
import config from "./config";

interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export const uploadService = {
  getPresignedUrl: (
    token: string,
    fileType: "avatar" | "cover",
    sheetUuid: string
  ): Promise<PresignedUrlResponse> =>
    httpClient
      .post<PresignedUrlResponse>(
        "/upload/presigned-url",
        { fileType, sheetUuid },
        config(token)
      )
      .then(({ data }) => data),

  getPresignedUrlForMap: (
    token: string,
    mapId: string,
  ): Promise<PresignedUrlResponse> =>
    httpClient
      .post<PresignedUrlResponse>(
        "/upload/presigned-url",
        { fileType: "map_bg", mapUuid: mapId },
        config(token),
      )
      .then(({ data }) => data),

  uploadToR2: (uploadUrl: string, blob: Blob): Promise<void> =>
    fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: blob,
    }).then((res) => {
      if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
    }),
};
