import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OptionRadioGroup } from "@/components/domain/OptionRadioGroup";
import type { AssistanceOption } from "@/lib/schemas";

const OPTIONS: AssistanceOption[] = [
  { id: "BYPASS_LEFT", label: "Bypass kiri", risk: "low", reason: "Jalur kiri bersih" },
  { id: "BYPASS_RIGHT", label: "Bypass kanan", risk: "medium", reason: "Ada peralatan" },
];

describe("OptionRadioGroup", () => {
  it("renders exactly the backend options without pre-selecting any", () => {
    render(<OptionRadioGroup options={OPTIONS} value={null} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
  });

  it("calls onChange with the chosen option id", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<OptionRadioGroup options={OPTIONS} value={null} onChange={onChange} />);
    await user.click(screen.getByText("Bypass kanan"));
    expect(onChange).toHaveBeenCalledWith("BYPASS_RIGHT");
  });

  it("disables all options while submitting", () => {
    render(<OptionRadioGroup options={OPTIONS} value={null} onChange={() => {}} disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });
});
