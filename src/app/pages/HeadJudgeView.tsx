import { useNavigate, useParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import ConnectionStatusIndicator from "../components/ConnectionStatusIndicator";
import HeatCompletionModal from "../components/HeatCompletionModal";
import JudgeScoreColumn from "../components/JudgeScoreColumn";
import { useAuth } from "../contexts/AuthContext";
import { apiGet, apiPost } from "../utils/api";
import { validateJudgeAgreementFrontend } from "../utils/judgeAgreementValidator";
import { clearJudgeColors, getJudgeColor } from "../utils/judgeColors";
import { getRiderColor } from "../utils/riderColors";
import { getWebSocketUrl } from "../utils/websocket";

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
  const [completionModalOpen, setCompletionModalOpen] = createSignal(false);
  const [validationResult, setValidationResult] = createSignal(null);
  const [wsConnected, setWsConnected] = createSignal(false);

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

  // WebSocket connection for real-time updates
  createEffect(() => {
    const heatId = params.heatId;
    if (!heatId) return;

    // Get WebSocket URL (handles Vite dev server vs production)
    const wsUrl = getWebSocketUrl(`/api/heats/${heatId}/head-judge/stream`);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      // Subscribe to state updates
      ws.send(JSON.stringify({ type: "subscribe", subscriptions: ["state"] }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "head_judge_state") {
          // Trigger a refresh when we receive state updates
          refreshHeat();
        } else if (message.type === "ping") {
          // Respond to heartbeat
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
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

  const handleCompleteHeat = () => {
    const state = heatState();
    if (!state) return;

    // Collect all scores for validation
    const allScores = state.judges.flatMap((judge) => judge.scores);

    // Get rider names
    const riderNames: Record<string, string> = {};
    state.riders.forEach((rider) => {
      riderNames[rider.riderId] = `${rider.firstName} ${rider.lastName}`;
    });

    // Validate
    const result = validateJudgeAgreementFrontend(allScores, riderNames);
    setValidationResult(result);
    setCompletionModalOpen(true);
  };

  const handleConfirmCompletion = async () => {
    try {
      await apiPost(`/api/heats/${params.heatId}/complete`, {});
      setCompletionModalOpen(false);
      refreshHeat();
    } catch (error) {
      console.error("Error completing heat:", error);
      alert(error instanceof Error ? error.message : "Failed to complete heat");
    }
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
                <ConnectionStatusIndicator isOnline={isOnline() && wsConnected()} />

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
                        <div class="text-lg font-semibold">
                          Waiting for judges to submit scores...
                        </div>
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

                {/* Completion button */}
                <Show when={state().completedAt === null}>
                  <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
                    <button
                      type="button"
                      onClick={handleCompleteHeat}
                      disabled={!isOnline()}
                      class="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Complete Heat
                    </button>
                  </div>
                </Show>

                {/* Completion Modal */}
                <HeatCompletionModal
                  isOpen={completionModalOpen()}
                  onClose={() => setCompletionModalOpen(false)}
                  onConfirm={handleConfirmCompletion}
                  validationResult={validationResult()}
                  judgeNames={Object.fromEntries(
                    state().judges.map((j) => [j.judgeId, j.judgeName])
                  )}
                />
              </div>
            );
          }}
        </Show>
      </Show>
    </Show>
  );
};

export default HeadJudgeView;
