import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import Badge from "../../../src/app/components/ui/Badge";

describe("Badge", () => {
  it("should render with default props (default variant, small size)", () => {
    render(() => <Badge>Default Badge</Badge>);

    const badge = screen.getByText("Default Badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-gray-200");
    expect(badge).toHaveClass("text-gray-800");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("px-1.5");
  });

  it("should render default variant with correct styles", () => {
    render(() => <Badge variant="default">Default</Badge>);

    const badge = screen.getByText("Default");
    expect(badge).toHaveClass("bg-gray-200");
    expect(badge).toHaveClass("text-gray-800");
  });

  it("should render success variant with correct styles", () => {
    render(() => <Badge variant="success">Success</Badge>);

    const badge = screen.getByText("Success");
    expect(badge).toHaveClass("bg-green-100");
    expect(badge).toHaveClass("text-green-800");
  });

  it("should render warning variant with correct styles", () => {
    render(() => <Badge variant="warning">Warning</Badge>);

    const badge = screen.getByText("Warning");
    expect(badge).toHaveClass("bg-yellow-100");
    expect(badge).toHaveClass("text-yellow-800");
  });

  it("should render danger variant with correct styles", () => {
    render(() => <Badge variant="danger">Danger</Badge>);

    const badge = screen.getByText("Danger");
    expect(badge).toHaveClass("bg-red-100");
    expect(badge).toHaveClass("text-red-800");
  });

  it("should render info variant with correct styles", () => {
    render(() => <Badge variant="info">Info</Badge>);

    const badge = screen.getByText("Info");
    expect(badge).toHaveClass("bg-blue-100");
    expect(badge).toHaveClass("text-blue-800");
  });

  it("should render small size with correct styles", () => {
    render(() => <Badge size="sm">Small</Badge>);

    const badge = screen.getByText("Small");
    expect(badge).toHaveClass("px-1.5");
    expect(badge).toHaveClass("py-0.5");
    expect(badge).toHaveClass("text-xs");
  });

  it("should render medium size with correct styles", () => {
    render(() => <Badge size="md">Medium</Badge>);

    const badge = screen.getByText("Medium");
    expect(badge).toHaveClass("px-2");
    expect(badge).toHaveClass("py-1");
    expect(badge).toHaveClass("text-sm");
  });

  it("should apply custom classes", () => {
    render(() => <Badge class="font-mono">Custom</Badge>);

    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("font-mono");
  });

  it("should render with base classes", () => {
    render(() => <Badge>Badge</Badge>);

    const badge = screen.getByText("Badge");
    expect(badge).toHaveClass("inline-flex");
    expect(badge).toHaveClass("items-center");
    expect(badge).toHaveClass("font-medium");
    expect(badge).toHaveClass("rounded");
    expect(badge).toHaveClass("shrink-0");
  });

  it("should combine variant and size props correctly", () => {
    render(() => (
      <Badge variant="success" size="md">
        Large Success
      </Badge>
    ));

    const badge = screen.getByText("Large Success");
    // Variant classes
    expect(badge).toHaveClass("bg-green-100");
    expect(badge).toHaveClass("text-green-800");
    // Size classes
    expect(badge).toHaveClass("px-2");
    expect(badge).toHaveClass("py-1");
    expect(badge).toHaveClass("text-sm");
  });

  it("should render complex children", () => {
    render(() => (
      <Badge>
        <span>Complex</span> <strong>Content</strong>
      </Badge>
    ));

    expect(screen.getByText("Complex")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("should render numeric children", () => {
    render(() => <Badge>42</Badge>);

    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
