import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createMemo, createSignal, For, Show } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import type { Heat, Rider } from "../types";
import HeatCreationForm from "./HeatCreationForm";

interface HeatCardProps {
  heat: Heat;
  participants: Rider[];
  seasonId: string;
  contestId: string;
  divisionId: string;
  bracketId: string;
  onHeatUpdate?: () => void;
}

interface RiderDisplay {
  rider: Rider;
  position: number | null;
  isWinner: boolean;
}

const HeatCard: Component<HeatCardProps> = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = createSignal(false);

  // Get rider display name with sail number
  const getRiderDisplayName = (rider: Rider) => {
    if (rider.sailNumber) {
      return (
        <div class="flex items-center justify-between gap-2">
          <span class="truncate">
            {rider.firstName} {rider.lastName}
          </span>
          <span class="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
            {rider.sailNumber}
          </span>
        </div>
      );
    }
    return (
      <span class="truncate">
        {rider.firstName} {rider.lastName}
      </span>
    );
  };

  // Calculate rider display order and winner status
  const riderDisplays = createMemo((): RiderDisplay[] => {
    const heat = props.heat;

    // If no riders yet (pending)
    if (heat.riderIds.length === 0) {
      return [];
    }

    // If heat not complete, show riders in original order
    if (!heat.completedAt) {
      return heat.riderIds
        .map((id) => {
          const rider = props.participants.find((r) => r.id === id);
          if (!rider) {
            console.warn(`Rider ${id} not found in participants`);
            return null;
          }
          return {
            rider,
            position: null,
            isWinner: false,
          };
        })
        .filter((d): d is RiderDisplay => d !== null);
    }

    // If complete, calculate positions from scores
    try {
      // Simple score calculation: sum all scores per rider, sort descending
      const riderTotals = heat.riderIds.map((riderId) => {
        const riderScores = heat.scores.filter((s) => s.riderId === riderId);
        const total = riderScores.reduce((sum, s) => sum + s.score, 0);
        return { riderId, total };
      });

      riderTotals.sort((a, b) => b.total - a.total);

      return riderTotals
        .map((result, index) => {
          const rider = props.participants.find((r) => r.id === result.riderId);
          if (!rider) {
            console.warn(`Rider ${result.riderId} not found in participants`);
            return null;
          }
          return {
            rider,
            position: index + 1,
            isWinner: index === 0,
          };
        })
        .filter((d): d is RiderDisplay => d !== null);
    } catch (error) {
      console.error("Error calculating heat results:", error);
      // Fallback: show riders in original order
      return heat.riderIds
        .map((id) => {
          const rider = props.participants.find((r) => r.id === id);
          if (!rider) {
            console.warn(`Rider ${id} not found in participants`);
            return null;
          }
          return {
            rider,
            position: null,
            isWinner: false,
          };
        })
        .filter((d): d is RiderDisplay => d !== null);
    }
  });

  const navigateToScoreSheet = () => {
    navigate(
      `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${props.divisionId}/brackets/${props.bracketId}/heats/${props.heat.heatId}`
    );
  };

  // Determine heat status
  const isPending = createMemo(() => props.heat.riderIds.length === 0);
  const isComplete = createMemo(() => props.heat.completedAt !== null);
  const isBye = createMemo(() => props.heat.riderIds.length === 1 && isComplete());

  return (
    <div
      class={`bg-gray-50 rounded-lg p-3 border ${
        isPending()
          ? "border-gray-200 opacity-50"
          : isComplete()
            ? "border-l-4 border-l-green-500 border-gray-200"
            : "border-gray-200"
      }`}
    >
      {/* Header: Heat position */}
      <div class="flex items-center justify-between mb-2">
        <h6 class="text-sm font-semibold text-gray-800">Heat {props.heat.position}</h6>
        <Show when={auth.isHeadJudgeOrAdmin() && !isPending()}>
          <button
            type="button"
            onClick={() => setShowEditDialog(true)}
            class="text-gray-400 hover:text-indigo-600 text-sm cursor-pointer transition-colors"
            aria-label="Edit heat"
            title="Edit heat"
          >
            📝
          </button>
        </Show>
      </div>

      {/* Riders */}
      <div class="space-y-1 mb-2">
        <Show when={isPending()}>
          <p class="text-xs text-gray-500">Waiting for riders...</p>
        </Show>

        <Show when={!isPending()}>
          <Show when={isBye() && riderDisplays()[0]}>
            {(display) => (
              <div class="px-2 py-1 bg-green-50 rounded">
                <p class="text-sm text-green-700 font-semibold">
                  {getRiderDisplayName(display().rider)}
                </p>
                <p class="text-xs text-green-600">Bye</p>
              </div>
            )}
          </Show>

          <Show when={!isBye()}>
            <For each={riderDisplays()}>
              {(display) => (
                <div
                  class={`px-2 py-1 rounded ${
                    display.isWinner ? "font-semibold text-green-700 bg-green-50" : "text-gray-700"
                  }`}
                >
                  {getRiderDisplayName(display.rider)}
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>

      {/* Rules */}
      <p class="text-xs text-gray-500 mb-2">
        {props.heat.heatRules.wavesCounting}W, {props.heat.heatRules.jumpsCounting}J
      </p>

      {/* Action Button */}
      <Show when={!isPending() && !isBye()}>
        <button
          type="button"
          onClick={navigateToScoreSheet}
          class={`w-full px-3 py-1.5 text-xs rounded-md ${
            isComplete()
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {isComplete() ? "View Results" : "Score Heat"}
        </button>
      </Show>

      {/* Edit Heat Dialog */}
      <Show when={showEditDialog()}>
        <HeatCreationForm
          bracketId={props.bracketId}
          participants={props.participants}
          heat={props.heat}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false);
            props.onHeatUpdate?.();
          }}
        />
      </Show>
    </div>
  );
};

export default HeatCard;
