import type { Component } from "solid-js";
import { createMemo, createSignal, For } from "solid-js";
import type { Bracket, HeatListItem, Rider } from "../types";
import { sortHeatsByPosition } from "../utils/heat-sorting";
import HeatCard from "./HeatCard";

interface SingleEliminationBracketMobileProps {
  bracket: Bracket;
  heats: HeatListItem[];
  participants: Rider[];
  seasonId: string;
  contestId: string;
  divisionId: string;
  onHeatUpdate: () => void;
}

interface RoundData {
  roundNumber: number;
  roundName: string;
  heats: HeatListItem[];
}

const SingleEliminationBracketMobile: Component<SingleEliminationBracketMobileProps> = (props) => {
  // Group heats by round
  const rounds = createMemo((): RoundData[] => {
    const roundMap = new Map<number, RoundData>();

    for (const heat of props.heats) {
      if (!roundMap.has(heat.roundNumber)) {
        roundMap.set(heat.roundNumber, {
          roundNumber: heat.roundNumber,
          roundName: heat.roundName,
          heats: [],
        });
      }
      roundMap.get(heat.roundNumber)?.heats.push(heat);
    }

    // Sort heats within each round by position (e.g., 1a, 1b, 2a, 2b)
    for (const round of roundMap.values()) {
      round.heats = sortHeatsByPosition(round.heats);
    }

    return Array.from(roundMap.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  });

  const [selectedRound, setSelectedRound] = createSignal(rounds()[0]?.roundNumber ?? 1);

  const currentRoundHeats = () => {
    const round = rounds().find((r) => r.roundNumber === selectedRound());
    return round?.heats || [];
  };

  return (
    <div class="space-y-4">
      {/* Tab Navigation */}
      <div class="flex overflow-x-auto border-b border-gray-200">
        <For each={rounds()}>
          {(round) => (
            <button
              type="button"
              onClick={() => setSelectedRound(round.roundNumber)}
              class={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
                selectedRound() === round.roundNumber
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              {round.roundName}
            </button>
          )}
        </For>
      </div>

      {/* Heat Cards */}
      <div class="space-y-3">
        <For each={currentRoundHeats()}>
          {(heat) => (
            <HeatCard
              heat={heat}
              participants={props.participants}
              seasonId={props.seasonId}
              contestId={props.contestId}
              divisionId={props.divisionId}
              bracketId={props.bracket.id}
              onHeatUpdate={props.onHeatUpdate}
            />
          )}
        </For>
      </div>
    </div>
  );
};

export default SingleEliminationBracketMobile;
