import type { Component } from "solid-js";
import { createEffect, createSignal, For } from "solid-js";
import type { Heat, Rider } from "../types";
import { apiPost, apiPut } from "../utils/api";

interface HeatCreationFormProps {
  bracketId: string;
  participants: Rider[];
  heat?: Heat | null;
  onClose: () => void;
  onSuccess: () => void;
}

const HeatCreationForm: Component<HeatCreationFormProps> = (props) => {
  const isEditing = () => props.heat !== null && props.heat !== undefined;
  const [heatId, setHeatId] = createSignal("");
  const [selectedRiders, setSelectedRiders] = createSignal<string[]>([]);
  const [wavesCounting, setWavesCounting] = createSignal(2);
  const [jumpsCounting, setJumpsCounting] = createSignal(1);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  createEffect(() => {
    if (props.heat) {
      setHeatId(props.heat.heatId);
      setSelectedRiders(props.heat.riderIds);
      setWavesCounting(props.heat.heatRules.wavesCounting);
      setJumpsCounting(props.heat.heatRules.jumpsCounting);
    } else {
      setHeatId("");
      setSelectedRiders([]);
      setWavesCounting(2);
      setJumpsCounting(1);
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (selectedRiders().length === 0) {
      setError("Please select at least one rider");
      setLoading(false);
      return;
    }

    try {
      if (isEditing()) {
        await apiPut(`/api/heats/${heatId()}`, {
          riderIds: selectedRiders(),
          heatRules: {
            wavesCounting: wavesCounting(),
            jumpsCounting: jumpsCounting(),
          },
        });
      } else {
        await apiPost("/api/heats", {
          heatId: heatId(),
          bracketId: props.bracketId,
          riderIds: selectedRiders(),
          heatRules: {
            wavesCounting: wavesCounting(),
            jumpsCounting: jumpsCounting(),
          },
        });
      }
      props.onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing()
            ? "Failed to update heat"
            : "Failed to create heat"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleRider = (riderId: string) => {
    const current = selectedRiders();
    if (current.includes(riderId)) {
      setSelectedRiders(current.filter((id) => id !== riderId));
    } else {
      setSelectedRiders([...current, riderId]);
    }
  };

  return (
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {isEditing() ? "Edit Heat" : "Create Heat"}
        </h3>
        {error() && (
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-800">{error()}</p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {!isEditing() && (
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Heat ID <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={heatId()}
                onInput={(e) => setHeatId(e.currentTarget.value)}
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
          {isEditing() && (
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Heat ID</label>
              <input
                type="text"
                value={heatId()}
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>
          )}

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Select Riders <span class="text-red-500">*</span>
            </label>
            <div class="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
              <For each={props.participants}>
                {(rider) => (
                  <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRiders().includes(rider.id)}
                      onChange={() => toggleRider(rider.id)}
                      class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span class="text-sm">
                      {rider.firstName} {rider.lastName} ({rider.country})
                    </span>
                  </label>
                )}
              </For>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Waves Counting <span class="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={wavesCounting()}
              onInput={(e) => setWavesCounting(Number(e.currentTarget.value))}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Jumps Counting <span class="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={jumpsCounting()}
              onInput={(e) => setJumpsCounting(Number(e.currentTarget.value))}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div class="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={props.onClose}
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading()}
              class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading()
                ? isEditing()
                  ? "Updating..."
                  : "Creating..."
                : isEditing()
                  ? "Update Heat"
                  : "Create Heat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeatCreationForm;
