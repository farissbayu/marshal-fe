import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchJob: vi.fn() };
});

import { JobStatusPanel } from "@/components/common/JobStatusPanel";
import { fetchJob } from "@/lib/api";

describe("JobStatusPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onComplete once the job reaches a terminal state", async () => {
    vi.mocked(fetchJob).mockResolvedValue({
      job_id: "JOB-0001",
      kind: "release_evaluate",
      status: "done",
      progress: 100,
      message: "Selesai",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const onComplete = vi.fn();
    renderWithProviders(<JobStatusPanel jobId="JOB-0001" onComplete={onComplete} />);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("renders an unknown-state panel when the job cannot be found", async () => {
    vi.mocked(fetchJob).mockRejectedValue(new Error("job not found"));
    renderWithProviders(<JobStatusPanel jobId="JOB-9999" />);
    expect(await screen.findByText("Status pekerjaan tidak diketahui")).toBeInTheDocument();
  });
});
