import type { Component, JSX } from "solid-js";
import { onCleanup, onMount, Show } from "solid-js";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
  footer?: JSX.Element;
  size?: "sm" | "md" | "lg";
  closeOnBackdropClick?: boolean;
}

const Modal: Component<ModalProps> = (props) => {
  const size = () => props.size || "md";
  const closeOnBackdropClick = () => props.closeOnBackdropClick ?? true;

  const sizeClasses = () => {
    switch (size()) {
      case "sm":
        return "w-[calc(100%-2rem)] sm:w-80 max-w-sm";
      case "md":
        return "w-[calc(100%-2rem)] sm:w-96 max-w-md";
      case "lg":
        return "w-[calc(100%-2rem)] sm:w-[32rem] max-w-lg";
      default:
        return "w-[calc(100%-2rem)] sm:w-96 max-w-md";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && props.isOpen) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (closeOnBackdropClick() && e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
        onClick={handleBackdropClick}
        data-testid="modal-backdrop"
      >
        <div
          class={`relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border shadow-lg rounded-md bg-white ${sizeClasses()}`}
          data-testid="modal-content"
        >
          <div class="mt-3">
            <h3
              class="text-base sm:text-lg font-medium text-gray-900 mb-4"
              data-testid="modal-title"
            >
              {props.title}
            </h3>
            <div class="modal-body">{props.children}</div>
            <Show when={props.footer}>
              <div class="modal-footer mt-4">{props.footer}</div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Modal;
