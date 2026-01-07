import type { Component } from "solid-js";
import { createMemo } from "solid-js";

interface ConnectionStatusIndicatorProps {
  isOnline: boolean;
  isReconnecting?: boolean;
}

const ConnectionStatusIndicator: Component<ConnectionStatusIndicatorProps> = (props) => {
  // Determine current status
  const status = createMemo(() => {
    if (props.isReconnecting) {
      return {
        color: "bg-yellow-500",
        text: "Reconnecting...",
        textColor: "text-yellow-800",
        bgColor: "bg-yellow-50/90",
        borderColor: "border-yellow-200",
        isAlert: true,
      };
    }
    if (!props.isOnline) {
      return {
        color: "bg-red-500",
        text: "Offline - Score entry disabled",
        textColor: "text-red-800",
        bgColor: "bg-red-50/90",
        borderColor: "border-red-200",
        isAlert: true,
      };
    }
    return {
      color: "bg-green-500",
      text: "Online",
      textColor: "text-gray-600",
      bgColor: "bg-white/90",
      borderColor: "border-gray-200",
      isAlert: false,
    };
  });

  return (
    <div
      class={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm shadow-sm transition-all ${
        status().bgColor
      } ${status().borderColor} ${status().isAlert ? "shadow-md" : ""}`}
      role="status"
      aria-live="polite"
    >
      {/* Status dot */}
      <span class={`h-2 w-2 rounded-full ${status().color}`} aria-hidden="true" />

      {/* Status text */}
      <span class={`text-xs font-medium ${status().textColor}`}>{status().text}</span>
    </div>
  );
};

export default ConnectionStatusIndicator;
