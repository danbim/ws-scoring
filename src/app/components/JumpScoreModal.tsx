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

const PRIMARY_JUMP_TYPES: Array<{ value: JumpType; label: string }> = [
  { value: "forward", label: "F" },
  { value: "tableTop", label: "T" },
  { value: "pushLoop", label: "P" },
  { value: "backloop", label: "B" },
  { value: "tableTopForward", label: "TF" },
  { value: "doubleForward", label: "2xF" },
  { value: "pushForward", label: "PF" },
];

const OTHER_JUMP_TYPES: Array<{ value: JumpType; label: string }> = [
  { value: "tripleForward", label: "3xF" },
  { value: "doubleBackloop", label: "2xB" },
  { value: "doublePushLoop", label: "2xP" },
  { value: "shaka", label: "Shaka" },
  { value: "crazyPete", label: "CP" },
  { value: "cheeseRoll", label: "CR" },
  { value: "donkeyKick", label: "DK" },
];

// Combined array for label lookup
const ALL_JUMP_TYPES = [...PRIMARY_JUMP_TYPES, ...OTHER_JUMP_TYPES];

const JUMP_MODIFIERS: Array<{ value: JumpModifier; label: string }> = [
  { value: "oneHanded", label: "OH" },
  { value: "oneFooted", label: "OF" },
];

const JumpScoreModal: Component<JumpScoreModalProps> = (props) => {
  const [currentStep, setCurrentStep] = createSignal<1 | 2>(1);
  const [selectedJumpType, setSelectedJumpType] = createSignal<JumpType | null>(null);
  const [selectedModifiers, setSelectedModifiers] = createSignal<JumpModifier[]>([]);
  const [inputValue, setInputValue] = createSignal<string>("");
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string>("");
  const [showOtherTypes, setShowOtherTypes] = createSignal<boolean>(false);

  // Initialize or reset values when modal opens or initialValue changes
  createEffect(() => {
    if (props.isOpen) {
      if (props.initialValue !== undefined) {
        setSelectedJumpType(props.initialValue.jumpType);
        setSelectedModifiers([...props.initialValue.modifiers]);
        setInputValue(props.initialValue.score.toString());
        setCurrentStep(1);
        // Determine which group the initial jump type belongs to
        const isOtherType = OTHER_JUMP_TYPES.some(
          (jt) => jt.value === props.initialValue?.jumpType
        );
        setShowOtherTypes(isOtherType);
      } else {
        setSelectedJumpType(null);
        setSelectedModifiers([]);
        setInputValue("");
        setCurrentStep(1);
        setShowOtherTypes(false);
      }
      setError("");
    }
  });

  const handleJumpTypeSelect = (jumpType: JumpType) => {
    // Determine toggle behavior: if already selected, unselect?
    // Usually for radio-button style, clicking again keeps it selected or does nothing.
    // Let's keep it simple: clicking selects it.
    // If the user wants to unselect, they can't really, but they can select another one.
    // That seems fine for a required field.
    setSelectedJumpType(jumpType);
  };

  const toggleModifier = (modifier: JumpModifier) => {
    const current = selectedModifiers();
    if (current.includes(modifier)) {
      setSelectedModifiers(current.filter((m) => m !== modifier));
    } else {
      setSelectedModifiers([...current, modifier]);
    }
  };

  const handleNext = () => {
    if (!selectedJumpType()) {
      // Should effectively be disabled, but strict check here
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep() === 2) {
      setCurrentStep(1);
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
    const found = ALL_JUMP_TYPES.find((jt) => jt.value === jumpType);
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
            <div class="text-white/80 text-xs mt-2">Step {currentStep()} of 2</div>
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

          {/* Step 1: Select Jump Type & Modifiers */}
          <Show when={currentStep() === 1}>
            <div class="mb-4">
              <div class="block text-sm font-medium text-gray-700 mb-2">
                Select Modifiers (Optional)
              </div>
              <div class="grid grid-cols-3 gap-2 mb-4">
                <For each={JUMP_MODIFIERS}>
                  {(modifier) => (
                    <button
                      type="button"
                      onClick={() => toggleModifier(modifier.value)}
                      class={
                        selectedModifiers().includes(modifier.value)
                          ? "bg-cyan-500 text-white font-semibold text-base rounded-md min-h-[48px] transition-colors touch-manipulation"
                          : "bg-cyan-100 text-gray-900 font-semibold text-base rounded-md min-h-[48px] transition-colors touch-manipulation hover:bg-cyan-200 active:bg-cyan-300"
                      }
                      aria-label={`Modifier ${modifier.label}`}
                      aria-pressed={selectedModifiers().includes(modifier.value)}
                    >
                      {modifier.label}
                    </button>
                  )}
                </For>
              </div>

              <div class="block text-sm font-medium text-gray-700 mb-2">Select Jump Type</div>
              <div class="grid grid-cols-4 gap-2 mb-4">
                <For each={showOtherTypes() ? OTHER_JUMP_TYPES : PRIMARY_JUMP_TYPES}>
                  {(jumpType) => (
                    <button
                      type="button"
                      onClick={() => handleJumpTypeSelect(jumpType.value)}
                      class={
                        selectedJumpType() === jumpType.value
                          ? "bg-blue-600 text-white font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation ring-2 ring-offset-1 ring-blue-600"
                          : "bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-gray-900 font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                      }
                      aria-label={`Jump type ${jumpType.label}`}
                      aria-pressed={selectedJumpType() === jumpType.value}
                    >
                      {jumpType.label}
                    </button>
                  )}
                </For>
                <button
                  type="button"
                  onClick={() => setShowOtherTypes(!showOtherTypes())}
                  class={
                    showOtherTypes()
                      ? "bg-gray-600 text-white font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                      : "bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 font-semibold text-base rounded-md min-h-[56px] transition-colors touch-manipulation"
                  }
                  aria-label={showOtherTypes() ? "Show common jump types" : "Show other jump types"}
                  aria-pressed={showOtherTypes()}
                >
                  {showOtherTypes() ? "Common" : "Other"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedJumpType()}
                class="w-full px-4 py-3 text-base font-bold bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                NEXT
              </button>
            </div>
          </Show>

          {/* Step 2: Enter Score (was Step 3) */}
          <Show when={currentStep() === 2}>
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
