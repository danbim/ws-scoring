import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../../src/components/ui/button";

describe("Button", () => {
  it("should render with default variant", () => {
    render(() => <Button>Click me</Button>);

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("should render secondary variant", () => {
    render(() => <Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should render destructive variant", () => {
    render(() => <Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should render ghost variant", () => {
    render(() => <Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should render outline variant", () => {
    render(() => <Button variant="outline">Outline</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should render link variant", () => {
    render(() => <Button variant="link">Link</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should render sm size", () => {
    render(() => <Button size="sm">Small</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should render lg size", () => {
    render(() => <Button size="lg">Large</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
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

  it("should apply custom classes", () => {
    render(() => <Button class="custom-class w-full">Custom</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should set button type attribute", () => {
    render(() => <Button type="submit">Submit</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");
  });
});
