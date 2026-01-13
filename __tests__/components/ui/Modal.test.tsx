import { render, screen, waitFor } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Modal from "../../../src/app/components/ui/Modal";

describe("Modal", () => {
  it("should not render when isOpen is false", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={false} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    ));

    expect(screen.queryByTestId("modal-backdrop")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Modal")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    ));

    expect(screen.getByTestId("modal-backdrop")).toBeInTheDocument();
    expect(screen.getByTestId("modal-title")).toHaveTextContent("Test Modal");
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("should display title and children", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="My Dialog">
        <div>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </div>
      </Modal>
    ));

    expect(screen.getByTestId("modal-title")).toHaveTextContent("My Dialog");
    expect(screen.getByText("First paragraph")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph")).toBeInTheDocument();
  });

  it("should call onClose when ESC key is pressed", async () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    ));

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("should call onClose when backdrop is clicked (default behavior)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    ));

    const backdrop = screen.getByTestId("modal-backdrop");
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should not call onClose when backdrop is clicked if closeOnBackdropClick is false", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Test Modal" closeOnBackdropClick={false}>
        <p>Content</p>
      </Modal>
    ));

    const backdrop = screen.getByTestId("modal-backdrop");
    await user.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("should not call onClose when modal content is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Click me</p>
      </Modal>
    ));

    const content = screen.getByText("Click me");
    await user.click(content);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("should render small size with correct classes", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Small Modal" size="sm">
        <p>Content</p>
      </Modal>
    ));

    const modalContent = screen.getByTestId("modal-content");
    expect(modalContent).toHaveClass("sm:w-80");
    expect(modalContent).toHaveClass("max-w-sm");
  });

  it("should render medium size with correct classes (default)", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Medium Modal" size="md">
        <p>Content</p>
      </Modal>
    ));

    const modalContent = screen.getByTestId("modal-content");
    expect(modalContent).toHaveClass("sm:w-96");
    expect(modalContent).toHaveClass("max-w-md");
  });

  it("should render large size with correct classes", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="Large Modal" size="lg">
        <p>Content</p>
      </Modal>
    ));

    const modalContent = screen.getByTestId("modal-content");
    expect(modalContent).toHaveClass("sm:w-[32rem]");
    expect(modalContent).toHaveClass("max-w-lg");
  });

  it("should render custom footer when provided", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Modal with Footer"
        footer={
          <div class="flex gap-2">
            <button type="button">Cancel</button>
            <button type="button">Save</button>
          </div>
        }
      >
        <p>Content</p>
      </Modal>
    ));

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("should not render footer when not provided", () => {
    const onClose = vi.fn();

    render(() => (
      <Modal isOpen={true} onClose={onClose} title="No Footer Modal">
        <p>Content</p>
      </Modal>
    ));

    const modalContent = screen.getByTestId("modal-content");
    expect(modalContent.querySelector(".modal-footer")).not.toBeInTheDocument();
  });
});
