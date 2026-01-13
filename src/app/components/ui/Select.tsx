import type { Component, JSX } from "solid-js";
import { For, Show } from "solid-js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onChange?: JSX.EventHandler<HTMLSelectElement, Event>;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  id?: string;
  class?: string;
}

const Select: Component<SelectProps> = (props) => {
  const selectId = () => props.id || `select-${Math.random().toString(36).substring(2, 9)}`;

  const baseClasses = "w-full px-3 py-2 text-sm border rounded-md transition-colors";
  const focusClasses =
    "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  const stateClasses = () => {
    if (props.disabled) {
      return "bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed";
    }
    if (props.error) {
      return "border-red-500 text-gray-900 focus:ring-red-500 focus:border-red-500";
    }
    return "border-gray-300 text-gray-900";
  };

  const classes = () => {
    return [baseClasses, focusClasses, stateClasses(), props.class || ""].filter(Boolean).join(" ");
  };

  return (
    <div class="w-full">
      <Show when={props.label}>
        <label for={selectId()} class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          {props.label}
          {props.required && <span class="text-red-500 ml-1">*</span>}
        </label>
      </Show>
      <select
        id={selectId()}
        value={props.value ?? ""}
        onChange={props.onChange}
        required={props.required}
        disabled={props.disabled}
        class={classes()}
      >
        <Show when={props.placeholder}>
          <option value="" disabled>
            {props.placeholder}
          </option>
        </Show>
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
      <Show when={props.error}>
        <p class="mt-1 text-xs sm:text-sm text-red-600" role="alert">
          {props.error}
        </p>
      </Show>
    </div>
  );
};

export default Select;
