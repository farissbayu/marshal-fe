import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchMedia: vi.fn() };
});

import { EvidenceViewer } from "@/components/common/EvidenceViewer";
import { fetchMedia } from "@/lib/api";
import { ApiError } from "@/lib/errors";

describe("EvidenceViewer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the media when available", async () => {
    vi.mocked(fetchMedia).mockResolvedValue({
      media_id: "media-002",
      kind: "image",
      content_type: "image/svg+xml",
      url: "data:image/svg+xml;utf8,<svg/>",
      available: true,
    });
    renderWithProviders(<EvidenceViewer mediaId="media-002" />);
    expect(await screen.findByAltText("Evidence media-002")).toBeInTheDocument();
  });

  it("shows a placeholder when media is expired/unavailable", async () => {
    vi.mocked(fetchMedia).mockRejectedValue(
      new ApiError({ status: 410, kind: "validation", message: "Media telah kedaluwarsa." }),
    );
    renderWithProviders(<EvidenceViewer mediaId="media-003" />);
    expect(
      await screen.findByText(/Media tidak tersedia|Media telah kedaluwarsa/),
    ).toBeInTheDocument();
  });
});
