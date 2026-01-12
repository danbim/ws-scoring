import type { Component } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import type { ValidationResult } from "../utils/judgeAgreementValidator";

interface HeatCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResult: ValidationResult | null;
  judgeNames: Record<string, string>;
}

const HeatCompletionModal: Component<HeatCompletionModalProps> = (props) => {
  const [acknowledged, setAcknowledged] = createSignal(false);

  const handleConfirm = () => {
    if (props.validationResult?.hasDiscrepancies && !acknowledged()) {
      return;
    }
    props.onConfirm();
  };

  const handleClose = () => {
    setAcknowledged(false);
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="p-6">
            <h2 class="text-2xl font-bold mb-4">Heat Completion Check</h2>

            <Show
              when={props.validationResult}
              fallback={<div class="text-gray-600">Validating...</div>}
            >
              {(result: () => ValidationResult) => (
                <>
                  <Show
                    when={!result().hasDiscrepancies}
                    fallback={
                      <>
                        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div class="font-semibold text-yellow-800">
                            ⚠ {result().discrepancies.length} discrepancy(ies) found
                          </div>
                        </div>

                        <div class="space-y-4 mb-6">
                          <For each={result().discrepancies}>
                            {(discrepancy) => (
                              <div class="border rounded p-3">
                                <div class="font-semibold mb-2">{discrepancy.riderName}</div>

                                <Show when={discrepancy.waveDiscrepancy}>
                                  <div class="mb-2">
                                    <div class="text-sm font-medium text-red-600">
                                      ⚠ Waves: Discrepancy detected
                                    </div>
                                    <div class="text-sm ml-4 space-y-1">
                                      <For
                                        each={Object.entries(
                                          discrepancy.waveDiscrepancy?.judgeCounts
                                        )}
                                      >
                                        {([judgeId, count]) => (
                                          <div>
                                            - {props.judgeNames[judgeId]}: {count} waves
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                </Show>

                                <Show when={discrepancy.jumpDiscrepancy}>
                                  <div>
                                    <div class="text-sm font-medium text-red-600">
                                      ⚠ Jumps: Discrepancy detected
                                    </div>
                                    <div class="text-sm ml-4 space-y-1">
                                      <For
                                        each={Object.entries(
                                          discrepancy.jumpDiscrepancy?.judgeCatalogs
                                        )}
                                      >
                                        {([judgeId, catalog]) => (
                                          <div>
                                            - {props.judgeNames[judgeId]}:{" "}
                                            {catalog.join(", ") || "none"}
                                          </div>
                                        )}
                                      </For>
                                    </div>
                                  </div>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>

                        <label class="flex items-start gap-2 mb-4">
                          <input
                            type="checkbox"
                            checked={acknowledged()}
                            onChange={(e) => setAcknowledged(e.currentTarget.checked)}
                            class="mt-1"
                          />
                          <span class="text-sm">
                            I have reviewed the discrepancies and want to proceed
                          </span>
                        </label>
                      </>
                    }
                  >
                    <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                      <div class="font-semibold text-green-800">✓ No discrepancies found</div>
                      <div class="text-sm text-green-700">
                        All judges agree on wave counts and jump catalogs.
                      </div>
                    </div>
                  </Show>

                  <div class="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={result().hasDiscrepancies && !acknowledged()}
                      class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Complete Heat
                    </button>
                  </div>
                </>
              )}
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default HeatCompletionModal;
