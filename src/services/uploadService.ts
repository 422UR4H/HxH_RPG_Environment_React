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
      .post<{ upload_url: string; public_url: string }>(
        "/upload/presigned-url",
        { file_type: fileType, sheet_uuid: sheetUuid },
        config(token)
      )
      .then(({ data }) => ({
        uploadUrl: data.upload_url,
        publicUrl: data.public_url,
      })),

  getPresignedUrlForMap: (
    token: string,
    mapId: string,
  ): Promise<PresignedUrlResponse> =>
    httpClient
      .post<{ upload_url: string; public_url: string }>(
        "/upload/presigned-url",
        { file_type: "map_bg", map_uuid: mapId },
        config(token),
      )
      .then(({ data }) => ({
        uploadUrl: data.upload_url,
        publicUrl: data.public_url,
      })),

  uploadToR2: (uploadUrl: string, blob: Blob): Promise<void> =>
    fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
      body: blob,
    }).then((res) => {
      if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
    }),
};
