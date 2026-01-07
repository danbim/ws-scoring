import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";

interface OnScreenKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  onEnter: () => void;
  maxValue?: number;
  minValue?: number;
}

const OnScreenKeyboard: Component<OnScreenKeyboardProps> = (props) => {
  const [errorMessage, setErrorMessage] = createSignal<string>("");

  const maxValue = () => props.maxValue ?? 10;
  const minValue = () => props.minValue ?? 0;

  const handleNumberClick = (num: string) => {
    const newValue = props.value + num;

    // Prevent multiple decimal points
    if (num === "." && props.value.includes(".")) {
      return;
    }

    // Clear any previous error
    setErrorMessage("");

    props.onChange(newValue);
  };

  const handleReset = () => {
    setErrorMessage("");
    props.onReset();
  };

  const handleEnter = () => {
    // Validate the input
    const numValue = parseFloat(props.value);

    if (props.value === "") {
      setErrorMessage("Please enter a value");
      return;
    }

    if (Number.isNaN(numValue)) {
      setErrorMessage("Invalid number");
      return;
    }

    if (numValue < minValue()) {
      setErrorMessage(`Value must be at least ${minValue()}`);
      return;
    }

    if (numValue > maxValue()) {
      setErrorMessage(`Value must be at most ${maxValue()}`);
      return;
    }

    // Valid input, clear error and call onEnter
    setErrorMessage("");
    props.onEnter();
  };

  const isEnterDisabled = () => {
    if (props.value === "") return true;

    const numValue = parseFloat(props.value);
    if (Number.isNaN(numValue)) return true;
    if (numValue < minValue()) return true;
    if (numValue > maxValue()) return true;

    return false;
  };

  const numberButtons = [
    ["1", "2", "3", "4"],
    ["5", "6", "7", "8"],
    ["9", "10", "0", "."],
  ];

  return (
    <div class="w-full">
      {/* Number Grid */}
      <div class="grid grid-cols-4 gap-2 mb-2">
        {numberButtons.map((row) =>
          row.map((num) => (
            <button
              type="button"
              onClick={() => handleNumberClick(num)}
              class="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-semibold text-lg rounded-md min-h-[56px] transition-colors touch-manipulation"
              aria-label={`Number ${num}`}
            >
              {num}
            </button>
          ))
        )}
      </div>

      {/* Action Buttons */}
      <div class="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          onClick={handleReset}
          class="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
          aria-label="Reset"
        >
          RESET
        </button>
        <button
          type="button"
          onClick={handleEnter}
          disabled={isEnterDisabled()}
          class="bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
          aria-label="Enter"
        >
          ENTER
        </button>
      </div>

      {/* Error Message */}
      <Show when={errorMessage()}>
        <div class="text-red-600 text-sm text-center mt-2" role="alert">
          {errorMessage()}
        </div>
      </Show>
    </div>
  );
};

export default OnScreenKeyboard;
