import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import Heading from "../../../src/app/components/ui/Heading";

describe("Heading", () => {
  it("should render h1 with correct semantic tag and styles", () => {
    render(() => <Heading level={1}>Page Title</Heading>);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveClass("text-xl");
    expect(heading).toHaveClass("sm:text-2xl");
    expect(heading).toHaveClass("font-bold");
    expect(heading).toHaveClass("text-gray-900");
  });

  it("should render h2 with correct semantic tag and styles", () => {
    render(() => <Heading level={2}>Section Title</Heading>);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveClass("text-lg");
    expect(heading).toHaveClass("sm:text-xl");
  });

  it("should render h3 with correct semantic tag and styles", () => {
    render(() => <Heading level={3}>Subsection Title</Heading>);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H3");
    expect(heading).toHaveClass("text-base");
    expect(heading).toHaveClass("sm:text-lg");
    expect(heading).toHaveClass("font-semibold");
  });

  it("should render h4 with correct semantic tag and styles", () => {
    render(() => <Heading level={4}>H4 Title</Heading>);

    const heading = screen.getByRole("heading", { level: 4 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H4");
    expect(heading).toHaveClass("text-sm");
    expect(heading).toHaveClass("sm:text-base");
    expect(heading).toHaveClass("font-semibold");
    expect(heading).toHaveClass("text-gray-800");
  });

  it("should render h5 with correct semantic tag and styles", () => {
    render(() => <Heading level={5}>H5 Title</Heading>);

    const heading = screen.getByRole("heading", { level: 5 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H5");
    expect(heading).toHaveClass("text-xs");
    expect(heading).toHaveClass("sm:text-sm");
    expect(heading).toHaveClass("font-semibold");
    expect(heading).toHaveClass("text-gray-800");
  });

  it("should render h6 with correct semantic tag and styles", () => {
    render(() => <Heading level={6}>H6 Title</Heading>);

    const heading = screen.getByRole("heading", { level: 6 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H6");
    expect(heading).toHaveClass("text-xs");
    expect(heading).toHaveClass("font-semibold");
    expect(heading).toHaveClass("text-gray-700");
  });

  it("should render children correctly", () => {
    render(() => <Heading level={1}>Test Heading Content</Heading>);

    expect(screen.getByText("Test Heading Content")).toBeInTheDocument();
  });

  it("should render complex children", () => {
    render(() => (
      <Heading level={2}>
        <span>Complex</span> <strong>Heading</strong>
      </Heading>
    ));

    expect(screen.getByText("Complex")).toBeInTheDocument();
    expect(screen.getByText("Heading")).toBeInTheDocument();
  });

  it("should apply custom classes", () => {
    render(() => (
      <Heading level={1} class="custom-heading-class">
        Custom Heading
      </Heading>
    ));

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("custom-heading-class");
    // Should still have base classes
    expect(heading).toHaveClass("font-bold");
    expect(heading).toHaveClass("text-gray-900");
  });

  it("should have base classes on all levels", () => {
    const { unmount } = render(() => <Heading level={1}>H1</Heading>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("font-bold");
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-gray-900");
    unmount();

    render(() => <Heading level={2}>H2</Heading>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("font-bold");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-gray-900");
  });

  it("should handle numeric children", () => {
    render(() => <Heading level={1}>123</Heading>);

    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("should maintain semantic HTML hierarchy", () => {
    render(() => (
      <div>
        <Heading level={1}>Main Title</Heading>
        <Heading level={2}>Section</Heading>
        <Heading level={3}>Subsection</Heading>
      </div>
    ));

    const h1 = screen.getByRole("heading", { level: 1 });
    const h2 = screen.getByRole("heading", { level: 2 });
    const h3 = screen.getByRole("heading", { level: 3 });

    expect(h1.tagName).toBe("H1");
    expect(h2.tagName).toBe("H2");
    expect(h3.tagName).toBe("H3");
  });
});
