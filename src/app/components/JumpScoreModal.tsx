import type { Component } from "solid-js";
import { createEffect, createSignal, For, Show } from "solid-js";
import type { JumpModifier, JumpType } from "@/domain/heat/types";
import OnScreenKeyboard from "./OnScreenKeyboard";

interface JumpScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  riderId: string;
  riderName: string;
  riderColor: string;
  onSubmit: (score: number, jumpType: JumpType, modifiers: JumpModifier[]) => Promise<void>;
  initialValue?: { score: number; jumpType: JumpType; modifiers: JumpModifier[] };
  mode: "add" | "edit";
}

const JUMP_TYPES: Array<{ value: JumpType; label: string }> = [
  { value: "forward", label: "F" },
  { value: "tableTop", label: "T" },
  { value: "pushLoop", label: "P" },
  { value: "backloop", label: "B" },
  { value: "tableTopForward", label: "TF" },
  { value: "doubleForward", label: "2xF" },
  { value: "pushForward", label: "PF" },
  { value: "tripleForward", label: "3xF" },
  { value: "doubleBackloop", label: "2xB" },
  { value: "doublePushLoop", label: "2xP" },
];

const JUMP_MODIFIERS: Array<{ value: JumpModifier; label: string }> = [
  { value: "oneHanded", label: "OH" },
  { value: "oneFooted", label: "OF" },
  { value: "oneHandedOneFooted", label: "OHOF" },
];

const JumpScoreModal: Component<JumpScoreModalProps> = (props) => {
  const [currentStep, setCurrentStep] = createSignal<1 | 2 | 3>(1);
  const [selectedJumpType, setSelectedJumpType] = createSignal<JumpType | null>(null);
  const [selectedModifiers, setSelectedModifiers] = createSignal<JumpModifier[]>([]);
  const [inputValue, setInputValue] = createSignal<string>("");
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>("");

  // Initialize or reset values when modal opens or initialValue changes
  createEffect(() => {
    if (props.isOpen) {
      if (props.initialValue !== undefined) {
        setSelectedJumpType(props.initialValue.jumpType);
        setSelectedModifiers([...props.initialValue.modifiers]);
        setInputValue(props.initialValue.score.toString());
        setCurrentStep(3); // Go directly to score entry in edit mode
      } else {
        setSelectedJumpType(null);
        setSelectedModifiers([]);
        setInputValue("");
        setCurrentStep(1);
      }
      setError("");
    }
  });

  const handleJumpTypeSelect = (jumpType: JumpType) => {
    setSelectedJumpType(jumpType);
    setCurrentStep(2); // Auto-advance to modifiers
  };

  const toggleModifier = (modifier: JumpModifier) => {
    const current = selectedModifiers();
    if (current.includes(modifier)) {
      setSelectedModifiers(current.filter((m) => m !== modifier));
    } else {
      setSelectedModifiers([...current, modifier]);
    }
  };

  const handleSkipModifiers = () => {
    setSelectedModifiers([]);
    setCurrentStep(3);
  };

  const handleContinueWithModifiers = () => {
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep() === 2) {
      setCurrentStep(1);
    } else if (currentStep() === 3) {
      setCurrentStep(2);
    }
  };

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

    const jumpType = selectedJumpType();
    if (!jumpType) {
      setError("Jump type not selected");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await props.onSubmit(numValue, jumpType, selectedModifiers());
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

  const getJumpTypeLabel = (jumpType: JumpType | null) => {
    if (!jumpType) return "";
    const found = JUMP_TYPES.find((jt) => jt.value === jumpType);
    return found ? found.label : "";
  };

  const getModifierLabels = (modifiers: JumpModifier[]) => {
    return modifiers
      .map((mod) => {
        const found = JUMP_MODIFIERS.find((jm) => jm.value === mod);
        return found ? found.label : "";
      })
      .join(", ");
  };

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
              {props.mode === "add" ? "Enter Jump Score" : "Edit Jump Score"}
            </h3>
            <p class="text-white/90 text-sm mt-1">{props.riderName}</p>
            <div class="text-white/80 text-xs mt-2">Step {currentStep()} of 3</div>
            {/* Show selected values in header */}
            <Show when={selectedJumpType()}>
              <div class="text-white/90 text-sm mt-1">
                Jump: {getJumpTypeLabel(selectedJumpType())}
                <Show when={selectedModifiers().length > 0}>
                  {` • Modifiers: ${getModifierLabels(selectedModifiers())}`}
                </Show>
              </div>
            </Show>
          </div>

          {/* Step 1: Select Jump Type */}
          <Show when={currentStep() === 1}>
            <div class="mb-4">
              <div class="block text-sm font-medium text-gray-700 mb-2">Select Jump Type</div>
              <div class="grid grid-cols-4 gap-2">
                <For each={JUMP_TYPES}>
                  {(jumpType) => (
                    <button
                      type="button"
                      onClick={() => handleJumpTypeSelect(jumpType.value)}
                      class="bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-gray-900 font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                      aria-label={`Jump type ${jumpType.label}`}
                    >
                      {jumpType.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Step 2: Select Modifiers (Optional) */}
          <Show when={currentStep() === 2}>
            <div class="mb-4">
              <div class="block text-sm font-medium text-gray-700 mb-2">
                Select Modifiers (Optional)
              </div>
              <div class="grid grid-cols-3 gap-2 mb-3">
                <For each={JUMP_MODIFIERS}>
                  {(modifier) => (
                    <button
                      type="button"
                      onClick={() => toggleModifier(modifier.value)}
                      class={
                        selectedModifiers().includes(modifier.value)
                          ? "bg-cyan-500 text-white font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                          : "bg-cyan-100 text-gray-900 font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation hover:bg-cyan-200 active:bg-cyan-300"
                      }
                      aria-label={`Modifier ${modifier.label}`}
                      aria-pressed={selectedModifiers().includes(modifier.value)}
                    >
                      {modifier.label}
                    </button>
                  )}
                </For>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSkipModifiers}
                  class="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                >
                  SKIP
                </button>
                <button
                  type="button"
                  onClick={handleContinueWithModifiers}
                  class="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                >
                  CONTINUE
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBack}
              class="w-full px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              BACK
            </button>
          </Show>

          {/* Step 3: Enter Score */}
          <Show when={currentStep() === 3}>
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

            <button
              type="button"
              onClick={handleBack}
              disabled={isLoading()}
              class="mt-4 w-full px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              BACK
            </button>
          </Show>

          {/* Cancel Button (shown on all steps) */}
          <button
            type="button"
            onClick={props.onClose}
            disabled={isLoading()}
            class="mt-2 w-full px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </Show>
  );
};

export default JumpScoreModal;
