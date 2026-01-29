import type { Component, JSX } from "solid-js";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "success" | "text" | "danger-text";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean | "responsive";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (e: MouseEvent) => void;
  children: JSX.Element;
  class?: string;
  "aria-label"?: string;
}

const Button: Component<ButtonProps> = (props) => {
  const variant = () => props.variant || "primary";
  const size = () => props.size || "md";

  const baseClasses =
    "rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = () => {
    switch (variant()) {
      case "primary":
        return "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed";
      case "secondary":
        return "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed";
      case "danger":
        return "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed";
      case "success":
        return "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-400 disabled:cursor-not-allowed";
      case "text":
        return "text-indigo-600 hover:text-indigo-800 focus:ring-indigo-500 disabled:text-indigo-300 disabled:cursor-not-allowed";
      case "danger-text":
        return "text-red-600 hover:text-red-800 focus:ring-red-500 disabled:text-red-300 disabled:cursor-not-allowed";
      default:
        return "";
    }
  };

  const sizeClasses = () => {
    switch (size()) {
      case "sm":
        return "px-2 py-1 text-xs sm:text-sm";
      case "md":
        return "px-3 py-2 sm:px-4 text-sm";
      case "lg":
        return "px-4 py-3 text-base font-bold";
      default:
        return "";
    }
  };

  const widthClasses = () => {
    if (!props.fullWidth) {
      return "";
    }
    if (props.fullWidth === "responsive") {
      return "w-full sm:w-auto";
    }
    // fullWidth === true or just truthy
    return "w-full";
  };

  const classes = () => {
    return [baseClasses, variantClasses(), sizeClasses(), widthClasses(), props.class || ""]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <button
      type={props.type || "button"}
      class={classes()}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props["aria-label"]}
    >
      {props.children}
    </button>
  );
};

export default Button;
