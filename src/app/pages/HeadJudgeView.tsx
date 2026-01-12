import type { Component } from "solid-js";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import ConnectionStatusIndicator from "../components/ConnectionStatusIndicator";
import JudgeScoreColumn from "../components/JudgeScoreColumn";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../utils/api";
import { getJudgeColor, clearJudgeColors } from "../utils/judgeColors";
import { getRiderColor } from "../utils/riderColors";

interface HeadJudgeState {
  heatId: string;
  heatRules: {
    wavesCounting: number;
    jumpsCounting: number;
  };
  riders: Array<{
    riderId: string;
    firstName: string;
    lastName: string;
    sailNumber: string;
    country: string;
  }>;
  judges: Array<{
    judgeId: string;
    judgeName: string;
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
    riderTotals: Record<string, number>;
  }>;
  bracketId: string;
  position: string;
  roundNumber: number;
  roundName: string;
  completedAt: Date | null;
}

const HeadJudgeView: Component = () => {
  const params = useParams<{ heatId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [isOnline, setIsOnline] = createSignal(true);
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);

  // Authorization check
  createEffect(() => {
    const user = auth.user();
    if (!user || (user.role !== "head_judge" && user.role !== "administrator")) {
      navigate("/");
    }
  });

  // Clear judge colors on mount
  createEffect(() => {
    clearJudgeColors();
  });

  const [heatState] = createResource(
    () => ({ heatId: params.heatId, trigger: refreshTrigger() }),
    async ({ heatId }) => {
      const data = await apiGet<HeadJudgeState>(`/api/heats/${heatId}/head-judge`);
      return data;
    }
  );

  // Check online status
  createEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const refreshHeat = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditScore = (scoreUUID: string, type: "wave" | "jump") => {
    // TODO: Open modal for editing
    console.log("Edit score:", scoreUUID, type);
  };

  const handleAddWave = (judgeId: string, riderId: string) => {
    // TODO: Open modal for adding wave
    console.log("Add wave for judge:", judgeId, "rider:", riderId);
  };

  const handleAddJump = (judgeId: string, riderId: string) => {
    // TODO: Open modal for adding jump
    console.log("Add jump for judge:", judgeId, "rider:", riderId);
  };

  return (
    <Show
      when={!heatState.loading}
      fallback={
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
          <div class="text-lg font-semibold">Loading head judge view...</div>
        </div>
      }
    >
      <Show
        when={!heatState.error}
        fallback={
          <div class="min-h-screen bg-gray-50 flex items-center justify-center">
            <div class="text-center">
              <div class="text-lg font-semibold text-red-600">Error</div>
              <div class="text-sm text-gray-600 mt-2">{heatState.error?.message}</div>
              <button
                type="button"
                onClick={refreshHeat}
                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        }
      >
        <Show
          when={heatState()}
          fallback={
            <div class="min-h-screen bg-gray-50 flex items-center justify-center">
              <div class="text-lg font-semibold">Heat not found</div>
            </div>
          }
        >
          {(state: () => HeadJudgeState) => {
            const riderNames: Record<string, string> = {};
            const riderColors: Record<string, string> = {};

            state().riders.forEach((rider) => {
              riderNames[rider.riderId] = `${rider.firstName} ${rider.lastName}`;
              riderColors[rider.riderId] = getRiderColor(rider.riderId);
            });

            return (
              <div class="min-h-screen bg-gray-50">
                <ConnectionStatusIndicator isOnline={isOnline()} />

                {/* Header */}
                <div class="bg-white border-b border-gray-200 px-4 py-4">
                  <h1 class="text-2xl font-bold text-gray-900">
                    Head Judge View - {state().roundName} Heat {state().position}
                  </h1>
                  <div class="text-sm text-gray-600 mt-1">
                    Rules: Best {state().heatRules.wavesCounting} waves, Best{" "}
                    {state().heatRules.jumpsCounting} jumps
                  </div>
                </div>

                {/* Empty state or judge columns */}
                <Show
                  when={state().judges.length > 0}
                  fallback={
                    <div class="flex items-center justify-center min-h-[400px]">
                      <div class="text-center text-gray-500">
                        <div class="text-lg font-semibold">Waiting for judges to submit scores...</div>
                        <div class="text-sm mt-2">Judge columns will appear as judges score</div>
                      </div>
                    </div>
                  }
                >
                  <div class="p-4 overflow-x-auto">
                    <div class="flex gap-4 min-w-min">
                      <For each={state().judges}>
                        {(judge) => (
                          <JudgeScoreColumn
                            judgeId={judge.judgeId}
                            judgeName={judge.judgeName}
                            judgeColor={getJudgeColor(judge.judgeId)}
                            riderIds={state().riders.map((r) => r.riderId)}
                            scores={judge.scores}
                            riderNames={riderNames}
                            riderColors={riderColors}
                            riderTotals={judge.riderTotals}
                            onEditScore={handleEditScore}
                            onAddWave={(riderId) => handleAddWave(judge.judgeId, riderId)}
                            onAddJump={(riderId) => handleAddJump(judge.judgeId, riderId)}
                            isOnline={isOnline()}
                            isCompleted={state().completedAt !== null}
                          />
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Completion button - TODO */}
                <Show when={state().completedAt === null}>
                  <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                    <button
                      type="button"
                      disabled={!isOnline()}
                      class="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Complete Heat
                    </button>
                  </div>
                </Show>
              </div>
            );
          }}
        </Show>
      </Show>
    </Show>
  );
};

export default HeadJudgeView;
