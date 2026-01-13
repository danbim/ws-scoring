import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Select from "../../../src/app/components/ui/Select";

describe("Select", () => {
  const mockOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  it("should render with default props", () => {
    render(() => <Select options={mockOptions} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass("border-gray-300");
  });

  it("should display all options", () => {
    render(() => <Select options={mockOptions} />);

    expect(screen.getByRole("option", { name: "Option 1" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option 2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option 3" })).toBeInTheDocument();
  });

  it("should display the selected value", () => {
    render(() => <Select options={mockOptions} value="option2" />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("option2");
  });

  it("should call onChange handler when selection changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(() => <Select options={mockOptions} onChange={handleChange} />);

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "option2");

    expect(handleChange).toHaveBeenCalled();
  });

  it("should render label when provided", () => {
    render(() => <Select options={mockOptions} label="Choose an option" id="select-test" />);

    const label = screen.getByText("Choose an option");
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("for", "select-test");

    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("id", "select-test");
  });

  it("should show required indicator when required", () => {
    render(() => <Select options={mockOptions} label="Country" required />);

    const requiredIndicator = screen.getByText("*");
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass("text-red-500");

    const select = screen.getByRole("combobox");
    expect(select).toBeRequired();
  });

  it("should render without label when label prop is not provided", () => {
    render(() => <Select options={mockOptions} />);

    const labels = screen.queryAllByRole("label");
    expect(labels.length).toBe(0);
  });

  it("should display error message and apply error styles", () => {
    render(() => <Select options={mockOptions} error="Please select an option" />);

    const errorMessage = screen.getByRole("alert");
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveTextContent("Please select an option");
    expect(errorMessage).toHaveClass("text-red-600");

    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("border-red-500");
  });

  it("should apply disabled styles and prevent selection", () => {
    render(() => <Select options={mockOptions} disabled value="option1" />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
    expect(select).toHaveClass("bg-gray-100");
    expect(select).toHaveClass("text-gray-600");
    expect(select).toHaveClass("cursor-not-allowed");
  });

  it("should display placeholder as first disabled option", () => {
    render(() => <Select options={mockOptions} placeholder="Select an option..." />);

    const placeholderOption = screen.getByRole("option", {
      name: "Select an option...",
    }) as HTMLOptionElement;
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption.value).toBe("");
    expect(placeholderOption.disabled).toBe(true);
  });

  it("should not render placeholder when not provided", () => {
    render(() => <Select options={mockOptions} />);

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(3); // Only the 3 actual options, no placeholder
  });

  it("should apply custom classes", () => {
    render(() => <Select options={mockOptions} class="custom-select-class" />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("custom-select-class");
  });

  it("should combine label, error, and required props correctly", () => {
    render(() => (
      <Select
        options={mockOptions}
        label="Category"
        error="Category is required"
        required
        id="category"
      />
    ));

    // Label with required indicator
    const select = screen.getByLabelText(/category/i);
    expect(select).toBeInTheDocument();
    const requiredIndicator = screen.getByText("*");
    expect(requiredIndicator).toBeInTheDocument();

    // Error message
    const errorMessage = screen.getByRole("alert");
    expect(errorMessage).toHaveTextContent("Category is required");

    // Select with error styles
    expect(select).toHaveClass("border-red-500");
    expect(select).toBeRequired();
  });

  it("should generate unique id when id prop is not provided", () => {
    render(() => <Select options={mockOptions} label="Test" />);

    const select = screen.getByRole("combobox");
    const id = select.getAttribute("id");
    expect(id).toBeTruthy();
    expect(id).toMatch(/^select-/);
  });

  it("should handle empty options array", () => {
    render(() => <Select options={[]} />);

    const select = screen.getByRole("combobox");
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(0);
  });

  it("should render placeholder with empty options array", () => {
    render(() => <Select options={[]} placeholder="No options available" />);

    const placeholderOption = screen.getByRole("option", {
      name: "No options available",
    });
    expect(placeholderOption).toBeInTheDocument();
  });
});
