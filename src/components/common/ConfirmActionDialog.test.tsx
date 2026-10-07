import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";

describe("ConfirmActionDialog", () => {
  it("does not confirm until the operator presses the confirm button", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmActionDialog
        open
        onOpenChange={() => {}}
        title="Konfirmasi"
        confirmLabel="Kirim"
        onConfirm={onConfirm}
      />,
    );
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Kirim" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables the confirm button while the action is pending to prevent double submit", () => {
    render(
      <ConfirmActionDialog
        open
        onOpenChange={() => {}}
        title="Konfirmasi"
        confirmLabel="Kirim"
        onConfirm={() => {}}
        pending
      />,
    );
    expect(screen.getByRole("button", { name: /Kirim/ })).toBeDisabled();
  });
});
