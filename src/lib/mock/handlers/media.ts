import type { Media } from "@/lib/schemas";
import { fail, type MockRequest } from "./helpers";

export function getMedia(req: MockRequest): Media {
  const media = req.db.media.find((m) => m.media_id === req.params.media_id);
  if (!media) {
    fail(404, `Media ${req.params.media_id} tidak ditemukan.`, "media_not_found");
  }
  if (!media.available) {
    fail(410, "Media sudah kedaluwarsa atau tidak tersedia.", "media_unavailable");
  }
  if (media.expires_at && new Date(media.expires_at).getTime() < Date.now()) {
    fail(410, "Media telah kedaluwarsa.", "media_expired");
  }
  return media;
}
