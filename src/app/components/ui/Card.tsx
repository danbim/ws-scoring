import type { Component, JSX } from "solid-js";

export interface CardProps {
  children: JSX.Element;
  padding?: "none" | "sm" | "md" | "lg";
  borderColor?: string;
  borderPosition?: "left" | "top" | "bottom" | "right" | "none";
  class?: string;
}

const Card: Component<CardProps> = (props) => {
  const padding = () => props.padding || "md";
  const borderPosition = () => props.borderPosition || "none";

  const baseClasses = "bg-white rounded-lg shadow-md";

  const paddingClasses = () => {
    switch (padding()) {
      case "none":
        return "";
      case "sm":
        return "p-2 sm:p-3";
      case "md":
        return "p-3 sm:p-4";
      case "lg":
        return "p-4 sm:p-6";
      default:
        return "";
    }
  };

  const borderClasses = () => {
    if (!props.borderColor || borderPosition() === "none") {
      return "border border-gray-200";
    }

    const position = borderPosition();
    const borderMap = {
      left: "border-l-4 border-y border-r border-gray-200",
      top: "border-t-4 border-x border-b border-gray-200",
      bottom: "border-b-4 border-x border-t border-gray-200",
      right: "border-r-4 border-y border-l border-gray-200",
    };

    return borderMap[position as keyof typeof borderMap] || "";
  };

  const classes = () => {
    return [baseClasses, paddingClasses(), borderClasses(), props.class || ""]
      .filter(Boolean)
      .join(" ");
  };

  const style = () => {
    if (props.borderColor && borderPosition() !== "none") {
      const position = borderPosition();
      return { [`border-${position}-color`]: props.borderColor };
    }
    return {};
  };

  return (
    <div class={classes()} style={style()}>
      {props.children}
    </div>
  );
};

export default Card;
