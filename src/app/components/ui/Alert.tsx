import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  children: JSX.Element;
  onClose?: () => void;
  icon?: JSX.Element;
  class?: string;
}

const Alert: Component<AlertProps> = (props) => {
  const variant = () => props.variant || "info";

  const baseClasses = "flex items-start gap-2 px-3 py-2 rounded-lg border shadow-sm";

  const variantClasses = () => {
    switch (variant()) {
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "";
    }
  };

  const classes = () => {
    return [baseClasses, variantClasses(), props.class || ""].filter(Boolean).join(" ");
  };

  const getAriaLive = () => {
    return variant() === "error" ? "assertive" : "polite";
  };

  return (
    <div class={classes()} role="alert" aria-live={getAriaLive()}>
      <Show when={props.icon}>
        <div class="flex-shrink-0">{props.icon}</div>
      </Show>
      <div class="flex-1 text-sm">{props.children}</div>
      <Show when={props.onClose}>
        <button
          type="button"
          onClick={props.onClose}
          class="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Close alert"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <title>Close</title>
            <path d="M12 4L4 12M4 4l8 8" />
          </svg>
        </button>
      </Show>
    </div>
  );
};

export default Alert;
