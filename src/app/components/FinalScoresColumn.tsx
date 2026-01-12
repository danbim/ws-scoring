import type { Component } from "solid-js";
import { For } from "solid-js";

interface FinalScoresColumnProps {
  riderIds: string[];
  riderNames: Record<string, string>;
  riderColors: Record<string, string>;
  averagedTotals: Record<string, number>;
}

const FinalScoresColumn: Component<FinalScoresColumnProps> = (props) => {
  return (
    <div class="flex-shrink-0 w-full md:w-96 bg-white rounded-lg shadow-md overflow-hidden border-2 border-green-500">
      {/* Header */}
      <div class="px-4 py-3 bg-green-600 text-white">
        <div class="font-bold text-lg">🏆 Final Scores</div>
        <div class="text-sm opacity-90">Averaged across all judges</div>
      </div>

      {/* Riders */}
      <div class="p-4 space-y-4">
        <For each={props.riderIds}>
          {(riderId) => {
            const riderName = props.riderNames[riderId] || "Unknown";
            const riderColor = props.riderColors[riderId] || "#000";
            const averagedTotal = props.averagedTotals[riderId] || 0;

            return (
              <div class="border-2 border-green-500 rounded-lg overflow-hidden">
                {/* Rider Header with Averaged Total */}
                <div
                  class="px-3 py-2 text-white font-semibold flex justify-between"
                  style={{ "background-color": riderColor }}
                >
                  <span>{riderName}</span>
                  <span class="text-lg">{averagedTotal.toFixed(2)}</span>
                </div>

                {/* Summary text */}
                <div class="p-3 bg-green-50 text-center text-sm text-gray-600">
                  Average of all judge scores
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default FinalScoresColumn;
