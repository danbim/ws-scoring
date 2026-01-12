import { render, screen, waitFor } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import JumpScoreModal from "../../src/app/components/JumpScoreModal";
import type { JumpModifier, JumpType } from "../../src/domain/heat/types";

describe("JumpScoreModal", () => {
  it("should not render when closed", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={false}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    expect(screen.queryByText("Enter Jump Score")).not.toBeInTheDocument();
  });

  it("should render when open", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    expect(screen.getByText("Enter Jump Score")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should display step 1 initially with jump type selection", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Select Jump Type")).toBeInTheDocument();
    expect(screen.getByText("Select Modifiers (Optional)")).toBeInTheDocument();
  });

  it("should allow selecting modifiers OH and OF", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    // Find and click OH modifier
    const ohButton = screen.getByRole("button", { name: /Modifier OH/i });
    await user.click(ohButton);
    expect(ohButton).toHaveAttribute("aria-pressed", "true");

    // Find and click OF modifier
    const ofButton = screen.getByRole("button", { name: /Modifier OF/i });
    await user.click(ofButton);
    expect(ofButton).toHaveAttribute("aria-pressed", "true");

    // Both should be selected
    expect(ohButton).toHaveAttribute("aria-pressed", "true");
    expect(ofButton).toHaveAttribute("aria-pressed", "true");
  });

  it("should allow selecting a jump type and proceeding to step 2", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    // Select Forward (F) jump type
    const forwardButton = screen.getByRole("button", { name: /Jump type F$/i });
    await user.click(forwardButton);
    expect(forwardButton).toHaveAttribute("aria-pressed", "true");

    // Click NEXT button
    const nextButton = screen.getByRole("button", { name: /NEXT/i });
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    // Should now be on step 2
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    });
    expect(screen.getByText("Score (0-10)")).toBeInTheDocument();
  });

  it("should complete full flow: select jump type, modifiers, enter score, and submit", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    // Step 1: Select modifiers (OH)
    const ohButton = screen.getByRole("button", { name: /Modifier OH/i });
    await user.click(ohButton);

    // Step 1: Select jump type (Forward)
    const forwardButton = screen.getByRole("button", { name: /Jump type F$/i });
    await user.click(forwardButton);

    // Go to step 2
    const nextButton = screen.getByRole("button", { name: /NEXT/i });
    await user.click(nextButton);

    // Step 2: Enter score using on-screen keyboard
    await waitFor(() => {
      expect(screen.getByText("Score (0-10)")).toBeInTheDocument();
    });

    // Click number buttons to enter "8.5"
    const button8 = screen.getByRole("button", { name: "Number 8" });
    await user.click(button8);

    const buttonDot = screen.getByRole("button", { name: "Number ." });
    await user.click(buttonDot);

    const button5 = screen.getByRole("button", { name: "Number 5" });
    await user.click(button5);

    // Submit the score
    const enterButton = screen.getByRole("button", { name: /ENTER/i });
    await user.click(enterButton);

    // Verify onSubmit was called with correct parameters
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(8.5, "forward", ["oneHanded"]);
    });

    // Modal should close
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("should display edit mode correctly with initial values", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="edit"
        initialValue={{
          score: 7.5,
          jumpType: "tableTop" as JumpType,
          modifiers: ["oneFooted"] as JumpModifier[],
        }}
      />
    ));

    expect(screen.getByText("Edit Jump Score")).toBeInTheDocument();
    expect(screen.getByText(/Jump: T/)).toBeInTheDocument();
    expect(screen.getByText(/Modifiers: OF/)).toBeInTheDocument();
  });

  it("should disable NEXT button when no jump type is selected", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    const nextButton = screen.getByRole("button", { name: /NEXT/i });
    expect(nextButton).toBeDisabled();
  });

  it("should allow going back from step 2 to step 1", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    // Select jump type and go to step 2
    const forwardButton = screen.getByRole("button", { name: /Jump type F$/i });
    await user.click(forwardButton);

    const nextButton = screen.getByRole("button", { name: /NEXT/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    });

    // Click BACK button
    const backButton = screen.getByRole("button", { name: /BACK/i });
    await user.click(backButton);

    // Should be back on step 1
    await waitFor(() => {
      expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    });
  });

  it("should close modal when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(() => (
      <JumpScoreModal
        isOpen={true}
        onClose={onClose}
        riderId="rider-1"
        riderName="John Doe"
        riderColor="#FF0000"
        onSubmit={onSubmit}
        mode="add"
      />
    ));

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });
});
