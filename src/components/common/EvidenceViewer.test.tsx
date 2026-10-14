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

  it("renders video element when media kind is clip with mp4 video", async () => {
    vi.mocked(fetchMedia).mockResolvedValue({
      media_id: "media-010",
      kind: "clip",
      content_type: "video/mp4",
      url: "https://storage.googleapis.com/bucket/replays/run1.mp4",
      available: true,
    });
    renderWithProviders(<EvidenceViewer mediaId="media-010" />);
    const video = await screen.findByLabelText("Evidence media-010");
    expect(video).toBeInTheDocument();
    expect(video.tagName.toLowerCase()).toBe("video");
    expect(video).toHaveAttribute("src", "https://storage.googleapis.com/bucket/replays/run1.mp4");
  });

  it("renders bounding box overlay when boxes are provided", async () => {
    vi.mocked(fetchMedia).mockResolvedValue({
      media_id: "media-001",
      kind: "image",
      content_type: "image/svg+xml",
      url: "data:image/svg+xml;utf8,<svg/>",
      available: true,
    });
    renderWithProviders(
      <EvidenceViewer
        mediaId="media-001"
        boxes={[{ label: "Worker", box: [100, 200, 500, 600], confidence: 0.94 }]}
      />,
    );
    expect(await screen.findByText(/Worker \(94%\)/)).toBeInTheDocument();
    expect(screen.getByTestId("evidence-bbox")).toBeInTheDocument();
  });

  it("shows a placeholder when the API returns a raw gs:// url", async () => {
    vi.mocked(fetchMedia).mockResolvedValue({
      media_id: "media-gs",
      kind: "clip",
      content_type: "video/mp4",
      url: "gs://bucket/assist/case-01.mp4",
      available: true,
    });
    renderWithProviders(<EvidenceViewer mediaId="media-gs" fill />);
    expect(await screen.findByText(/GCS belum dikonfigurasi/i)).toBeInTheDocument();
    expect(screen.queryByRole("video")).not.toBeInTheDocument();
  });

  it("renders edge-to-edge in fill mode without the media caption", async () => {
    vi.mocked(fetchMedia).mockResolvedValue({
      media_id: "media-011",
      kind: "clip",
      content_type: "video/mp4",
      url: "https://storage.googleapis.com/bucket/replays/run2.mp4",
      available: true,
    });
    renderWithProviders(<EvidenceViewer mediaId="media-011" label="case-01" fill />);
    expect(await screen.findByLabelText("case-01")).toHaveClass("h-full");
    expect(screen.queryByText(/media-011 · clip/)).not.toBeInTheDocument();
  });

  it("offers a retry when the media request times out (cold GCS fetch)", async () => {
    vi.mocked(fetchMedia).mockRejectedValue(
      new ApiError({ status: 0, kind: "timeout", message: "Permintaan melebihi batas waktu." }),
    );
    renderWithProviders(<EvidenceViewer mediaId="media-slow" />);
    expect(
      await screen.findByText(/Media belum bisa dimuat dari server/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Coba lagi/i })).toBeInTheDocument();
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
