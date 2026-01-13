import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Input from "../../../src/app/components/ui/Input";

describe("Input", () => {
  it("should render with default props (text input)", () => {
    render(() => <Input />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveClass("border-gray-300");
  });

  it("should render with different input types", () => {
    const { unmount } = render(() => <Input type="number" />);
    let input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
    unmount();

    render(() => <Input type="email" />);
    input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
  });

  it("should display the value prop", () => {
    render(() => <Input value="test value" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("test value");
  });

  it("should call onInput handler when user types", async () => {
    const user = userEvent.setup();
    const handleInput = vi.fn();

    render(() => <Input onInput={handleInput} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "hello");

    expect(handleInput).toHaveBeenCalled();
    expect(handleInput.mock.calls.length).toBeGreaterThan(0);
  });

  it("should render label when provided", () => {
    render(() => <Input label="Username" id="username" />);

    const label = screen.getByText("Username");
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("for", "username");

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "username");
  });

  it("should show required indicator when required", () => {
    render(() => <Input label="Email" required />);

    const requiredIndicator = screen.getByText("*");
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass("text-red-500");

    const input = screen.getByRole("textbox");
    expect(input).toBeRequired();
  });

  it("should render without label when label prop is not provided", () => {
    render(() => <Input placeholder="Enter text" />);

    const labels = screen.queryAllByRole("label");
    expect(labels.length).toBe(0);
  });

  it("should display error message and apply error styles", () => {
    render(() => <Input error="This field is required" />);

    const errorMessage = screen.getByRole("alert");
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent("This field is required");
    expect(errorMessage).toHaveClass("text-red-600");

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-red-500");
  });

  it("should apply disabled styles and prevent input", () => {
    render(() => <Input disabled value="disabled text" />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    expect(input).toHaveClass("bg-gray-100");
    expect(input).toHaveClass("text-gray-600");
    expect(input).toHaveClass("cursor-not-allowed");
  });

  it("should display placeholder", () => {
    render(() => <Input placeholder="Enter your name" />);

    const input = screen.getByPlaceholderText("Enter your name");
    expect(input).toBeInTheDocument();
  });

  it("should apply custom classes", () => {
    render(() => <Input class="custom-input-class" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-input-class");
  });

  it("should combine label, error, and required props correctly", () => {
    render(() => <Input label="Password" error="Password is too short" required id="password" />);

    // Label with required indicator
    const label = screen.getByLabelText(/password/i);
    expect(label).toBeInTheDocument();
    const requiredIndicator = screen.getByText("*");
    expect(requiredIndicator).toBeInTheDocument();

    // Error message
    const errorMessage = screen.getByRole("alert");
    expect(errorMessage).toHaveTextContent("Password is too short");

    // Input with error styles
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-red-500");
    expect(input).toBeRequired();
  });

  it("should generate unique id when id prop is not provided", () => {
    render(() => <Input label="Test" />);

    const input = screen.getByRole("textbox");
    const id = input.getAttribute("id");
    expect(id).toBeTruthy();
    expect(id).toMatch(/^input-/);
  });

  it("should handle number input type with number value", () => {
    render(() => <Input type="number" value={42} />);

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(42);
  });
});
