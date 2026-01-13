import type { Component } from "solid-js";
import { createEffect, createSignal, For, Show } from "solid-js";
import type { Heat, Rider } from "../types";
import { apiPost, apiPut } from "../utils/api";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Modal from "./ui/Modal";

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
    <Modal
      isOpen={true}
      onClose={props.onClose}
      title={isEditing() ? "Edit Heat" : "Create Heat"}
      size="sm"
      closeOnBackdropClick={false}
      footer={
        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <Button variant="secondary" fullWidth="responsive" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth="responsive"
            disabled={loading()}
            onClick={handleSubmit}
          >
            {loading()
              ? isEditing()
                ? "Updating..."
                : "Creating..."
              : isEditing()
                ? "Update Heat"
                : "Create Heat"}
          </Button>
        </div>
      }
    >
      <Show when={error()}>
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-800">{error()}</p>
        </div>
      </Show>
      <form onSubmit={handleSubmit}>
        <Show when={!isEditing()}>
          <div class="mb-4">
            <Input
              id="heat-id"
              label="Heat ID"
              value={heatId()}
              onInput={(e) => setHeatId(e.currentTarget.value)}
              required
            />
          </div>
        </Show>
        <Show when={isEditing()}>
          <div class="mb-4">
            <Input id="heat-id-disabled" label="Heat ID" value={heatId()} disabled />
          </div>
        </Show>

        <div class="mb-4">
          <div class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Select Riders (optional)
          </div>
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
                  <span class="text-xs sm:text-sm">
                    {rider.firstName} {rider.lastName} ({rider.country})
                  </span>
                </label>
              )}
            </For>
          </div>
        </div>

        <div class="mb-4">
          <Input
            id="waves-counting"
            type="number"
            label="Waves Counting"
            value={wavesCounting()}
            onInput={(e) => setWavesCounting(Number(e.currentTarget.value))}
            required
          />
        </div>

        <div class="mb-4">
          <Input
            id="jumps-counting"
            type="number"
            label="Jumps Counting"
            value={jumpsCounting()}
            onInput={(e) => setJumpsCounting(Number(e.currentTarget.value))}
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default HeatCreationForm;
