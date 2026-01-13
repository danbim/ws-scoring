import { type Component, createMemo, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: JSX.Element;
  class?: string;
}

const Heading: Component<HeadingProps> = (props) => {
  const baseClasses = "font-bold text-gray-900";

  const levelClasses = () => {
    switch (props.level) {
      case 1:
        return "text-xl sm:text-2xl";
      case 2:
        return "text-lg sm:text-xl";
      case 3:
        return "text-base sm:text-lg font-semibold";
      case 4:
        return "text-sm sm:text-base font-semibold text-gray-800";
      case 5:
        return "text-xs sm:text-sm font-semibold text-gray-800";
      case 6:
        return "text-xs font-semibold text-gray-700";
      default:
        return "";
    }
  };

  const classes = () => {
    return [baseClasses, levelClasses(), props.class || ""].filter(Boolean).join(" ");
  };

  const Tag = createMemo(() => {
    return `h${props.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  });

  return (
    <Dynamic component={Tag()} class={classes()}>
      {props.children}
    </Dynamic>
  );
};

export default Heading;
