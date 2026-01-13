import type { Component } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import OnScreenKeyboard from "./OnScreenKeyboard";
import Button from "./ui/Button";

interface WaveScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  riderId: string;
  riderName: string; // For display (e.g., "John Doe")
  riderColor: string; // Hex color for header background
  onSubmit: (score: number) => Promise<void>;
  initialValue?: number; // For editing existing scores
  mode: "add" | "edit";
}

const WaveScoreModal: Component<WaveScoreModalProps> = (props) => {
  const [inputValue, setInputValue] = createSignal<string>("");
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>("");

  // Initialize or reset input value when modal opens or initialValue changes
  createEffect(() => {
    if (props.isOpen) {
      if (props.initialValue !== undefined) {
        setInputValue(props.initialValue.toString());
      } else {
        setInputValue("");
      }
      setError("");
    }
  });

  const handleReset = () => {
    setInputValue("");
    setError("");
  };

  const handleEnter = async () => {
    const numValue = parseFloat(inputValue());

    // Validation should already be done by OnScreenKeyboard
    // But we add a safety check here
    if (Number.isNaN(numValue) || numValue < 0 || numValue > 10) {
      setError("Invalid score value");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await props.onSubmit(numValue);
      // Auto-dismiss on success
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit score");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: MouseEvent) => {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget && !isLoading()) {
      props.onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !isLoading()) {
      props.onClose();
    }
  };

  // Add keyboard listener for ESC key
  createEffect(() => {
    if (props.isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  });

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
        onClick={handleBackdropClick}
      >
        <div class="relative mx-auto p-6 border w-[calc(100%-2rem)] sm:w-[400px] max-w-md shadow-xl rounded-lg bg-white">
          {/* Header with rider name and color */}
          <div
            class="rounded-t-lg -mx-6 -mt-6 mb-4 px-6 py-4"
            style={{ "background-color": props.riderColor }}
          >
            <h3 class="text-lg font-semibold text-white">
              {props.mode === "add" ? "Enter Wave Score" : "Edit Wave Score"}
            </h3>
            <p class="text-white/90 text-sm mt-1">{props.riderName}</p>
          </div>

          {/* Score Preview */}
          <div class="mb-4">
            <div class="block text-sm font-medium text-gray-700 mb-2">Score (0-10)</div>
            <div class="w-full px-4 py-3 text-2xl font-semibold text-center border-2 border-gray-300 rounded-md bg-gray-50 min-h-[60px] flex items-center justify-center">
              <Show when={inputValue()} fallback={<span class="text-gray-400">-</span>}>
                {inputValue()}
              </Show>
            </div>
          </div>

          {/* On-Screen Keyboard */}
          <OnScreenKeyboard
            value={inputValue()}
            onChange={setInputValue}
            onReset={handleReset}
            onEnter={handleEnter}
            maxValue={10}
            minValue={0}
          />

          {/* Loading State */}
          <Show when={isLoading()}>
            <div class="text-center text-sm text-gray-600 mt-2">Submitting score...</div>
          </Show>

          {/* Error Message */}
          <Show when={error()}>
            <div class="text-red-600 text-sm text-center mt-2" role="alert">
              {error()}
            </div>
          </Show>

          {/* Cancel Button */}
          <div class="mt-4">
            <Button variant="secondary" fullWidth onClick={props.onClose} disabled={isLoading()}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default WaveScoreModal;
