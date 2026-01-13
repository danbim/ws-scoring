import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";

export interface InputProps {
  type?: "text" | "number" | "date" | "email";
  value?: string | number;
  onInput?: JSX.EventHandler<HTMLInputElement, InputEvent>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  id?: string;
  class?: string;
}

const Input: Component<InputProps> = (props) => {
  const inputId = () => props.id || `input-${Math.random().toString(36).substring(2, 9)}`;

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
        <label for={inputId()} class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          {props.label}
          {props.required && <span class="text-red-500 ml-1">*</span>}
        </label>
      </Show>
      <input
        id={inputId()}
        type={props.type || "text"}
        value={props.value ?? ""}
        onInput={props.onInput}
        placeholder={props.placeholder}
        required={props.required}
        disabled={props.disabled}
        class={classes()}
      />
      <Show when={props.error}>
        <p class="mt-1 text-xs sm:text-sm text-red-600" role="alert">
          {props.error}
        </p>
      </Show>
    </div>
  );
};

export default Input;
