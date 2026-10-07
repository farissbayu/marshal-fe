import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { mockRequest, resetDb } from "@/lib/mock";

async function call<T>(method: Parameters<typeof mockRequest>[0], path: string, body?: unknown) {
  return mockRequest(method, path, {}, body) as Promise<T>;
}

describe("mock transport", () => {
  beforeEach(() => resetDb());

  it("rejects an assistance decision with an option the backend never offered", async () => {
    await expect(
      call("POST", "/assistance/cases/case-01/decide", {
        option: "NOT_AN_OPTION",
        actor_id: "user-supervisor-01",
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("records the decision on an allowed option and reflects it in the queue", async () => {
    await call("POST", "/assistance/cases/case-01/decide", {
      option: "BYPASS_LEFT",
      actor_id: "user-supervisor-01",
    });
    const open = await call<{ items: Array<{ case_id: string }> }>(
      "GET",
      "/assistance/cases",
      undefined,
    );
    const stillOpen = await mockRequest("GET", "/assistance/cases", { open: true }, undefined);
    expect(
      (stillOpen as { items: Array<{ case_id: string }> }).items.some(
        (c) => c.case_id === "case-01",
      ),
    ).toBe(false);
    expect(open.items.some((c) => c.case_id === "case-01")).toBe(true);
  });

  it("returns 404 for an unknown VIN", async () => {
    await expect(call("GET", "/cars/VIN-999")).rejects.toBeInstanceOf(ApiError);
  });

  it("blocks proposal decisions that were already decided", async () => {
    await expect(
      call("POST", "/proposals/PROP-004/decide", {
        decision: "approve",
        actor_id: "user-supervisor-01",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("supports deterministic error injection", async () => {
    await expect(
      mockRequest("GET", "/yard", { __error: "unavailable" }, undefined),
    ).rejects.toMatchObject({ status: 503 });
  });
});
