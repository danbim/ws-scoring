import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Button from "../../../src/app/components/ui/Button";

describe("Button", () => {
  it("should render with default props (primary, medium size)", () => {
    render(() => <Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-indigo-600");
    expect(button).toHaveClass("px-3");
    expect(button).toHaveAttribute("type", "button");
  });

  it("should render primary variant with correct styles", () => {
    render(() => <Button variant="primary">Primary</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-indigo-600");
    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("hover:bg-indigo-700");
  });

  it("should render secondary variant with correct styles", () => {
    render(() => <Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-gray-200");
    expect(button).toHaveClass("text-gray-800");
    expect(button).toHaveClass("hover:bg-gray-300");
  });

  it("should render danger variant with correct styles", () => {
    render(() => <Button variant="danger">Delete</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-red-600");
    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("hover:bg-red-700");
  });

  it("should render success variant with correct styles", () => {
    render(() => <Button variant="success">Save</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-green-600");
    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("hover:bg-green-700");
  });

  it("should render text variant with correct styles", () => {
    render(() => <Button variant="text">Link</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-indigo-600");
    expect(button).toHaveClass("hover:text-indigo-800");
    expect(button).not.toHaveClass("bg-");
  });

  it("should render small size with correct styles", () => {
    render(() => <Button size="sm">Small</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("px-2");
    expect(button).toHaveClass("py-1");
    expect(button).toHaveClass("text-xs");
  });

  it("should render large size with correct styles", () => {
    render(() => <Button size="lg">Large</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("px-4");
    expect(button).toHaveClass("py-3");
    expect(button).toHaveClass("text-base");
    expect(button).toHaveClass("font-bold");
  });

  it("should render full width on all screen sizes when fullWidth is true", () => {
    render(() => <Button fullWidth>Full Width</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("w-full");
    expect(button).not.toHaveClass("sm:w-auto");
  });

  it("should render responsive width when fullWidth is responsive", () => {
    render(() => <Button fullWidth="responsive">Responsive Width</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("sm:w-auto");
  });

  it("should not render full width classes when fullWidth is false", () => {
    render(() => <Button fullWidth={false}>Not Full</Button>);

    const button = screen.getByRole("button");
    expect(button).not.toHaveClass("w-full");
  });

  it("should call onClick handler when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(() => <Button onClick={handleClick}>Click</Button>);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(() => (
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    ));

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should apply disabled styles when disabled", () => {
    render(() => <Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:cursor-not-allowed");
  });

  it("should set button type attribute", () => {
    render(() => <Button type="submit">Submit</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("should apply custom classes", () => {
    render(() => <Button class="custom-class">Custom</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should set aria-label attribute", () => {
    render(() => <Button aria-label="Close dialog">X</Button>);

    const button = screen.getByRole("button", { name: /close dialog/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Close dialog");
  });

  it("should combine variant, size, and fullWidth props correctly", () => {
    render(() => (
      <Button variant="danger" size="lg" fullWidth="responsive">
        Large Danger Full
      </Button>
    ));

    const button = screen.getByRole("button");
    // Variant classes
    expect(button).toHaveClass("bg-red-600");
    // Size classes
    expect(button).toHaveClass("px-4");
    expect(button).toHaveClass("text-base");
    // Width classes (responsive)
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("sm:w-auto");
  });
});
