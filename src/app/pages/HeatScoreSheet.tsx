import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import type { Heat } from "../types";
import { apiGet } from "../utils/api";

interface HeatScoreSheetProps {
  seasonId: string;
  contestId: string;
  divisionId: string;
  bracketId: string;
  heatId: string;
}

const HeatScoreSheet: Component<HeatScoreSheetProps> = (props) => {
  const [heat, setHeat] = createSignal<Heat | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const data = await apiGet<Heat>(`/api/heats/${props.heatId}`);
      setHeat(data);
    } catch (error) {
      console.error("Error loading heat:", error);
    } finally {
      setLoading(false);
    }
  });

  if (loading()) {
    return <div class="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Heat Score Sheet</h1>
      <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
        <p class="text-yellow-800">
          <strong>Placeholder:</strong> Score sheet view to be added later
        </p>
      </div>
      {heat() && (
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold mb-2">Heat ID: {heat()!.heatId}</h2>
          <p class="text-sm text-gray-600">Riders: {heat()!.riderIds.join(", ")}</p>
          <p class="text-sm text-gray-600">
            Rules: {heat()!.heatRules.wavesCounting} waves, {heat()!.heatRules.jumpsCounting} jumps
          </p>
        </div>
      )}
    </div>
  );
};

export default HeatScoreSheet;
