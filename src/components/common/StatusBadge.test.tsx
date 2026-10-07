import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, VehicleStatusBadge } from "@/components/common/StatusBadge";

describe("StatusBadge", () => {
  it("renders the correct label for PASS", () => {
    render(<StatusBadge status="PASS" />);
    expect(screen.getByText("PASS")).toBeInTheDocument();
  });

  it("renders the correct label for FAIL", () => {
    render(<StatusBadge status="FAIL" />);
    expect(screen.getByText("FAIL")).toBeInTheDocument();
  });

  it("renders a human readable label for vehicle states", () => {
    render(<VehicleStatusBadge state="waiting_dispatch" />);
    expect(screen.getByText("Waiting Dispatch")).toBeInTheDocument();
  });
});
