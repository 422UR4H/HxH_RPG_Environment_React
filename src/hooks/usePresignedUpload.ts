import { uploadService } from "../services/uploadService";

export function usePresignedUpload() {
  const getPresignedUrl = (token: string, mapId: string) =>
    uploadService.getPresignedUrlForMap(token, mapId);

  const uploadToR2 = (uploadUrl: string, blob: Blob) =>
    uploadService.uploadToR2(uploadUrl, blob);

  return { getPresignedUrl, uploadToR2 };
}
