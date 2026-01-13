import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import Card from "../../../src/app/components/ui/Card";

describe("Card", () => {
  it("should render with default props (medium padding, no colored border)", () => {
    render(() => (
      <Card>
        <p>Card content</p>
      </Card>
    ));

    const card = screen.getByText("Card content").parentElement;
    expect(card).toHaveClass("bg-white");
    expect(card).toHaveClass("rounded-lg");
    expect(card).toHaveClass("shadow-md");
    expect(card).toHaveClass("p-3");
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("border-gray-200");
  });

  it("should render children", () => {
    render(() => (
      <Card>
        <div>
          <h2>Title</h2>
          <p>Description</p>
        </div>
      </Card>
    ));

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("should apply no padding when padding is none", () => {
    render(() => (
      <Card padding="none">
        <p>No padding</p>
      </Card>
    ));

    const card = screen.getByText("No padding").parentElement;
    expect(card).not.toHaveClass("p-");
  });

  it("should apply small padding", () => {
    render(() => (
      <Card padding="sm">
        <p>Small padding</p>
      </Card>
    ));

    const card = screen.getByText("Small padding").parentElement;
    expect(card).toHaveClass("p-2");
    expect(card).toHaveClass("sm:p-3");
  });

  it("should apply medium padding (default)", () => {
    render(() => (
      <Card padding="md">
        <p>Medium padding</p>
      </Card>
    ));

    const card = screen.getByText("Medium padding").parentElement;
    expect(card).toHaveClass("p-3");
    expect(card).toHaveClass("sm:p-4");
  });

  it("should apply large padding", () => {
    render(() => (
      <Card padding="lg">
        <p>Large padding</p>
      </Card>
    ));

    const card = screen.getByText("Large padding").parentElement;
    expect(card).toHaveClass("p-4");
    expect(card).toHaveClass("sm:p-6");
  });

  it("should apply colored border on left side", () => {
    render(() => (
      <Card borderColor="#FF0000" borderPosition="left">
        <p>Left border</p>
      </Card>
    ));

    const card = screen.getByText("Left border").parentElement;
    expect(card).toHaveClass("border-l-4");
    expect(card).toHaveClass("border-y");
    expect(card).toHaveClass("border-r");
    expect(card).toHaveClass("border-gray-200");
  });

  it("should apply colored border on top side", () => {
    render(() => (
      <Card borderColor="#00FF00" borderPosition="top">
        <p>Top border</p>
      </Card>
    ));

    const card = screen.getByText("Top border").parentElement;
    expect(card).toHaveClass("border-t-4");
    expect(card).toHaveClass("border-x");
    expect(card).toHaveClass("border-b");
    expect(card).toHaveClass("border-gray-200");
  });

  it("should apply colored border on bottom side", () => {
    render(() => (
      <Card borderColor="#0000FF" borderPosition="bottom">
        <p>Bottom border</p>
      </Card>
    ));

    const card = screen.getByText("Bottom border").parentElement;
    expect(card).toHaveClass("border-b-4");
    expect(card).toHaveClass("border-x");
    expect(card).toHaveClass("border-t");
    expect(card).toHaveClass("border-gray-200");
  });

  it("should apply colored border on right side", () => {
    render(() => (
      <Card borderColor="#FFFF00" borderPosition="right">
        <p>Right border</p>
      </Card>
    ));

    const card = screen.getByText("Right border").parentElement;
    expect(card).toHaveClass("border-r-4");
    expect(card).toHaveClass("border-y");
    expect(card).toHaveClass("border-l");
    expect(card).toHaveClass("border-gray-200");
  });

  it("should not apply colored border when borderPosition is none", () => {
    render(() => (
      <Card borderColor="#FF0000" borderPosition="none">
        <p>No colored border</p>
      </Card>
    ));

    const card = screen.getByText("No colored border").parentElement;
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("border-gray-200");
    expect(card).not.toHaveClass("border-l-4");
    expect(card).not.toHaveClass("border-t-4");
  });

  it("should not apply colored border when borderColor is not provided", () => {
    render(() => (
      <Card borderPosition="left">
        <p>No color specified</p>
      </Card>
    ));

    const card = screen.getByText("No color specified").parentElement;
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("border-gray-200");
    expect(card).not.toHaveClass("border-l-4");
  });

  it("should apply custom classes", () => {
    render(() => (
      <Card class="custom-card-class">
        <p>Custom class</p>
      </Card>
    ));

    const card = screen.getByText("Custom class").parentElement;
    expect(card).toHaveClass("custom-card-class");
  });

  it("should combine padding, border, and custom class correctly", () => {
    render(() => (
      <Card padding="lg" borderColor="#00FF00" borderPosition="left" class="extra-class">
        <p>Combined props</p>
      </Card>
    ));

    const card = screen.getByText("Combined props").parentElement;
    // Base classes
    expect(card).toHaveClass("bg-white");
    expect(card).toHaveClass("rounded-lg");
    expect(card).toHaveClass("shadow-md");
    // Padding
    expect(card).toHaveClass("p-4");
    expect(card).toHaveClass("sm:p-6");
    // Border
    expect(card).toHaveClass("border-l-4");
    // Custom class
    expect(card).toHaveClass("extra-class");
  });
});
