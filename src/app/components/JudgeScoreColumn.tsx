import type { Component } from "solid-js";
import { For } from "solid-js";
import type { JumpModifier, JumpType } from "../../domain/heat/types";

interface JudgeScoreColumnProps {
  judgeId: string;
  judgeName: string;
  judgeColor: string;
  riderIds: string[];
  scores: Array<{
    scoreUUID: string;
    riderId: string;
    type: "wave" | "jump";
    scoreValue: number;
    jumpType: string | null;
    modifiers: string[] | null;
    timestamp: Date;
    isCounting: boolean;
  }>;
  riderNames: Record<string, string>;
  riderColors: Record<string, string>;
  riderTotals: Record<string, number>;
  onEditScore: (scoreUUID: string, type: "wave" | "jump") => void;
  onAddWave: (riderId: string) => void;
  onAddJump: (riderId: string) => void;
  isOnline: boolean;
  isCompleted: boolean;
}

const JudgeScoreColumn: Component<JudgeScoreColumnProps> = (props) => {
  const getScoresForRider = (riderId: string, type: "wave" | "jump") => {
    return props.scores
      .filter((s) => s.riderId === riderId && s.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  return (
    <div class="flex-shrink-0 w-full md:w-96 bg-white rounded-lg shadow-md overflow-hidden">
      {/* Judge Header */}
      <div
        class="px-4 py-3 text-white"
        style={{ "background-color": props.judgeColor }}
      >
        <div class="font-bold text-lg">👤 {props.judgeName}</div>
        <div class="text-sm opacity-90">Judge ID: {props.judgeId.slice(0, 8)}</div>
      </div>

      {/* Riders */}
      <div class="p-4 space-y-4">
        <For each={props.riderIds}>
          {(riderId) => {
            const riderName = props.riderNames[riderId] || "Unknown";
            const riderColor = props.riderColors[riderId] || "#000";
            const waveScores = getScoresForRider(riderId, "wave");
            const jumpScores = getScoresForRider(riderId, "jump");
            const total = props.riderTotals[riderId] || 0;

            return (
              <div class="border rounded-lg overflow-hidden">
                {/* Rider Header */}
                <div
                  class="px-3 py-2 text-white font-semibold flex justify-between"
                  style={{ "background-color": riderColor }}
                >
                  <span>{riderName}</span>
                  <span>{total.toFixed(2)}</span>
                </div>

                {/* Scores Grid */}
                <div class="grid grid-cols-2 divide-x">
                  {/* Waves */}
                  <div class="p-2">
                    <div class="text-xs font-semibold mb-2">WAVES</div>
                    <button
                      type="button"
                      onClick={() => props.onAddWave(riderId)}
                      disabled={!props.isOnline || props.isCompleted}
                      class="w-full py-4 text-xs text-gray-400 border border-dashed rounded hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                    >
                      + Add
                    </button>
                    <div class="space-y-1 mt-1">
                      <For each={waveScores}>
                        {(score) => (
                          <button
                            type="button"
                            onClick={() => props.onEditScore(score.scoreUUID, "wave")}
                            disabled={!props.isOnline || props.isCompleted}
                            class={`w-full text-left p-2 rounded text-xs ${
                              score.isCounting
                                ? "bg-blue-50 border border-blue-400"
                                : "bg-gray-50 border border-gray-200"
                            } hover:bg-blue-100 disabled:opacity-50`}
                          >
                            <div class="font-bold">{score.scoreValue.toFixed(2)}</div>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>

                  {/* Jumps */}
                  <div class="p-2">
                    <div class="text-xs font-semibold mb-2">JUMPS</div>
                    <button
                      type="button"
                      onClick={() => props.onAddJump(riderId)}
                      disabled={!props.isOnline || props.isCompleted}
                      class="w-full py-4 text-xs text-gray-400 border border-dashed rounded hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                    >
                      + Add
                    </button>
                    <div class="space-y-1 mt-1">
                      <For each={jumpScores}>
                        {(score) => (
                          <button
                            type="button"
                            onClick={() => props.onEditScore(score.scoreUUID, "jump")}
                            disabled={!props.isOnline || props.isCompleted}
                            class={`w-full text-left p-2 rounded text-xs ${
                              score.isCounting
                                ? "bg-blue-50 border border-blue-400"
                                : "bg-gray-50 border border-gray-200"
                            } hover:bg-blue-100 disabled:opacity-50`}
                          >
                            <div class="font-bold">
                              {score.scoreValue.toFixed(2)}
                              {score.jumpType && (
                                <span class="text-gray-600 ml-1">({score.jumpType})</span>
                              )}
                            </div>
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default JudgeScoreColumn;
