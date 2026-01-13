import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Alert from "../../../src/app/components/ui/Alert";

describe("Alert", () => {
  it("should render with default props (info variant)", () => {
    render(() => <Alert>Alert message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass("bg-blue-50");
    expect(alert).toHaveClass("border-blue-200");
    expect(alert).toHaveClass("text-blue-800");
    expect(alert).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Alert message")).toBeInTheDocument();
  });

  it("should render info variant with correct styles", () => {
    render(() => <Alert variant="info">Info message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-blue-50");
    expect(alert).toHaveClass("border-blue-200");
    expect(alert).toHaveClass("text-blue-800");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("should render success variant with correct styles", () => {
    render(() => <Alert variant="success">Success message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-green-50");
    expect(alert).toHaveClass("border-green-200");
    expect(alert).toHaveClass("text-green-800");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("should render warning variant with correct styles", () => {
    render(() => <Alert variant="warning">Warning message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-yellow-50");
    expect(alert).toHaveClass("border-yellow-200");
    expect(alert).toHaveClass("text-yellow-800");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("should render error variant with correct styles", () => {
    render(() => <Alert variant="error">Error message</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("bg-red-50");
    expect(alert).toHaveClass("border-red-200");
    expect(alert).toHaveClass("text-red-800");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("should render icon when provided", () => {
    render(() => <Alert icon={<span data-testid="alert-icon">!</span>}>Message with icon</Alert>);

    expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    expect(screen.getByText("Message with icon")).toBeInTheDocument();
  });

  it("should not render icon when not provided", () => {
    render(() => <Alert>Message without icon</Alert>);

    expect(screen.queryByTestId("alert-icon")).not.toBeInTheDocument();
  });

  it("should render close button when onClose is provided", () => {
    const onClose = vi.fn();

    render(() => <Alert onClose={onClose}>Dismissible alert</Alert>);

    const closeButton = screen.getByLabelText("Close alert");
    expect(closeButton).toBeInTheDocument();
  });

  it("should not render close button when onClose is not provided", () => {
    render(() => <Alert>Non-dismissible alert</Alert>);

    expect(screen.queryByLabelText("Close alert")).not.toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(() => <Alert onClose={onClose}>Dismissible alert</Alert>);

    const closeButton = screen.getByLabelText("Close alert");
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should apply custom classes", () => {
    render(() => <Alert class="custom-alert-class">Custom alert</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("custom-alert-class");
  });

  it("should render complex children", () => {
    render(() => (
      <Alert>
        <div>
          <strong>Title:</strong> <span>Description</span>
        </div>
      </Alert>
    ));

    expect(screen.getByText("Title:")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("should combine icon and close button correctly", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(() => (
      <Alert icon={<span data-testid="alert-icon">!</span>} onClose={onClose}>
        Full alert
      </Alert>
    ));

    expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    expect(screen.getByText("Full alert")).toBeInTheDocument();

    const closeButton = screen.getByLabelText("Close alert");
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should have base layout classes", () => {
    render(() => <Alert>Alert</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("flex");
    expect(alert).toHaveClass("items-start");
    expect(alert).toHaveClass("gap-2");
    expect(alert).toHaveClass("px-3");
    expect(alert).toHaveClass("py-2");
    expect(alert).toHaveClass("rounded-lg");
    expect(alert).toHaveClass("border");
    expect(alert).toHaveClass("shadow-sm");
  });

  it("should render error variant with assertive aria-live", () => {
    render(() => <Alert variant="error">Critical error</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });

  it("should render non-error variants with polite aria-live", () => {
    const { unmount } = render(() => <Alert variant="info">Info</Alert>);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    unmount();

    render(() => <Alert variant="success">Success</Alert>);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
  });
});
