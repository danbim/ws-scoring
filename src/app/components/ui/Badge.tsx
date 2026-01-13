import type { Component, JSX } from "solid-js";

export interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  children: JSX.Element;
  class?: string;
}

const Badge: Component<BadgeProps> = (props) => {
  const variant = () => props.variant || "default";
  const size = () => props.size || "sm";

  const baseClasses = "inline-flex items-center font-medium rounded shrink-0";

  const variantClasses = () => {
    switch (variant()) {
      case "default":
        return "bg-gray-200 text-gray-800";
      case "success":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "danger":
        return "bg-red-100 text-red-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "";
    }
  };

  const sizeClasses = () => {
    switch (size()) {
      case "sm":
        return "px-1.5 py-0.5 text-xs";
      case "md":
        return "px-2 py-1 text-sm";
      default:
        return "";
    }
  };

  const classes = () => {
    return [baseClasses, variantClasses(), sizeClasses(), props.class || ""]
      .filter(Boolean)
      .join(" ");
  };

  return <span class={classes()}>{props.children}</span>;
};

export default Badge;
