import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistanceProgress } from "@/components/domain/AssistanceProgress";

describe("AssistanceProgress", () => {
  it("shows the decision step as waiting while the case is open", () => {
    render(<AssistanceProgress status="OPEN" openedAt="2026-10-14T04:20:00Z" />);
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("waiting for supervisor")).toBeInTheDocument();
  });

  it("marks the escalation step for escalated cases", () => {
    render(<AssistanceProgress status="ESCALATED" openedAt="2026-10-14T04:20:00Z" />);
    expect(screen.getByText("ESCALATION")).toBeInTheDocument();
    expect(screen.getByText("waiting for field supervisor")).toBeInTheDocument();
  });

  it("marks every step done when the case is resolved", () => {
    render(
      <AssistanceProgress
        status="RESOLVED"
        openedAt="2026-10-14T04:20:00Z"
        resolvedAt="2026-10-14T04:25:00Z"
      />,
    );
    expect(screen.queryByText("waiting for supervisor")).not.toBeInTheDocument();
    expect(screen.queryByText("not completed")).not.toBeInTheDocument();
    expect(screen.getAllByText("RESOLVED").length).toBeGreaterThan(0);
  });
});
