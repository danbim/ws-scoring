import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { calculateRiderScoreTotals } from "../../domain/heat/score-calculator";
import type { JumpModifier, JumpType, Score } from "../../domain/heat/types";
import { useAuth } from "../contexts/AuthContext";
import type { HeatListItem, Rider } from "../types";
import { getViewerUrl } from "../utils/viewerUrl";
import HeatCreationForm from "./HeatCreationForm";
import Badge from "./ui/Badge";
import Heading from "./ui/Heading";

interface HeatCardProps {
  heat: HeatListItem;
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
          <Badge class="font-mono">{rider.sailNumber}</Badge>
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
        .map((id): RiderDisplay | null => {
          const rider = props.participants.find((r) => r.id === id);
          if (!rider) {
            console.warn(`Rider ${id} not found in participants`);
            return null;
          }
          return { rider, position: null, isWinner: false };
        })
        .filter((d): d is RiderDisplay => d !== null);
    }

    // If complete, calculate positions from scores using domain calculator
    try {
      // Map frontend scores to domain Score type (API returns scoreValue, domain uses score)
      const domainScores: Score[] = heat.scores.map((s) => {
        if (s.type === "jump") {
          return {
            type: "jump" as const,
            scoreUUID: s.scoreUUID,
            riderId: s.riderId,
            judgeId: s.judgeId,
            score: s.scoreValue,
            jumpType: (s.jumpType ?? "forward") as JumpType,
            modifiers: (s.modifiers ?? []) as JumpModifier[],
            timestamp: s.timestamp,
          };
        }
        return {
          type: "wave" as const,
          scoreUUID: s.scoreUUID,
          riderId: s.riderId,
          judgeId: s.judgeId,
          score: s.scoreValue,
          timestamp: s.timestamp,
        };
      });

      const riderTotals = calculateRiderScoreTotals({
        heatId: heat.heatId,
        riderIds: heat.riderIds,
        heatRules: heat.heatRules,
        scores: domainScores,
        bracketId: heat.bracketId,
        completedAt: heat.completedAt,
        position: heat.position,
      });

      return riderTotals
        .map((result, index): RiderDisplay | null => {
          const rider = props.participants.find((r) => r.id === result.riderId);
          if (!rider) {
            console.warn(`Rider ${result.riderId} not found in participants`);
            return null;
          }
          return { rider, position: index + 1, isWinner: index === 0 };
        })
        .filter((d): d is RiderDisplay => d !== null);
    } catch (error) {
      console.error("Error calculating heat results:", error);
      // Fallback: show riders in original order
      return heat.riderIds
        .map((id): RiderDisplay | null => {
          const rider = props.participants.find((r) => r.id === id);
          if (!rider) {
            console.warn(`Rider ${id} not found in participants`);
            return null;
          }
          return { rider, position: null, isWinner: false };
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
        <Heading level={6}>Heat {props.heat.position}</Heading>
        <div class="flex items-center gap-2">
          <a
            href={getViewerUrl(props.heat.heatId)}
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-400 hover:text-indigo-600 transition-colors"
            aria-label="Open live viewer"
            title="Open live viewer"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              role="img"
              aria-label="TV icon"
            >
              <rect x="2" y="7" width="20" height="13" rx="2" ry="2"></rect>
              <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
          </a>
          <Show when={auth.isHeadJudgeOrAdmin() && !isPending()}>
            <button
              type="button"
              onClick={() => navigate(`/head-judge/heats/${props.heat.heatId}`)}
              class="text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors"
              aria-label="Open head judge view"
              title="Open head judge view"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label="Clipboard icon"
              >
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </button>
          </Show>
          <Show when={auth.isHeadJudgeOrAdmin() && !isPending()}>
            <button
              type="button"
              onClick={() => setShowEditDialog(true)}
              class="text-gray-400 hover:text-indigo-600 cursor-pointer transition-colors"
              aria-label="Edit heat"
              title="Edit heat"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label="Edit icon"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </Show>
        </div>
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
                <p class="text-green-700 font-semibold">{getRiderDisplayName(display().rider)}</p>
                <p class="text-green-600">Bye</p>
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
        <Button
          variant={isComplete() ? "secondary" : "default"}
          size="sm"
          class="w-full"
          onClick={navigateToScoreSheet}
        >
          {isComplete() ? "View Results" : "Score Heat"}
        </Button>
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
