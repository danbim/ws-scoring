import type { Component } from "solid-js";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import type { JumpModifier, JumpType } from "@/domain/heat/types";
import ConnectionStatusIndicator from "../components/ConnectionStatusIndicator";
import JumpScoreModal from "../components/JumpScoreModal";
import Button from "../components/ui/Button";
import Heading from "../components/ui/Heading";
import WaveScoreModal from "../components/WaveScoreModal";
import { useAuth } from "../contexts/AuthContext";
import type { Heat, Rider } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";
import { getRiderColor } from "../utils/riderColors";
import { getViewerUrl } from "../utils/viewerUrl";

interface HeatScoreSheetProps {
  seasonId: string;
  contestId: string;
  divisionId: string;
  bracketId: string;
  heatId: string;
}

interface ScoreWithMeta {
  scoreUUID: string;
  riderId: string;
  scoreValue: number;
  timestamp: string | Date;
  type: "wave" | "jump";
  jumpType: string | null;
  modifiers: JumpModifier[] | null;
  judgeId: string;
  isCounting: boolean;
}

// Format jump type for display
function formatJumpType(jumpType: JumpType): string {
  const mapping: Record<JumpType, string> = {
    forward: "F",
    tableTop: "T",
    pushLoop: "P",
    backloop: "B",
    tableTopForward: "TF",
    doubleForward: "2xF",
    pushForward: "PF",
    tripleForward: "3xF",
    doubleBackloop: "2xB",
    doublePushLoop: "2xP",
    shaka: "Shaka",
    crazyPete: "CP",
    cheeseRoll: "CR",
    donkeyKick: "DK",
  };
  return mapping[jumpType] || jumpType;
}

// Format modifiers for display
function formatModifiers(modifiers: JumpModifier[]): string {
  if (!modifiers || modifiers.length === 0) return "";
  const mapping: Record<JumpModifier, string> = {
    oneHanded: "OH",
    oneFooted: "OF",
  };
  return `+${modifiers.map((m) => mapping[m]).join("+")}`;
}

// Format timestamp
function formatTimestamp(timestamp: string | Date): string {
  const timestampDate = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const seconds = Math.floor((Date.now() - timestampDate.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

const HeatScoreSheet: Component<HeatScoreSheetProps> = (props) => {
  const [isOnline, setIsOnline] = createSignal(true);
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);

  // Modal state
  const [waveModalOpen, setWaveModalOpen] = createSignal(false);
  const [jumpModalOpen, setJumpModalOpen] = createSignal(false);
  const [selectedRiderId, setSelectedRiderId] = createSignal<string | null>(null);
  const [editingScore, setEditingScore] = createSignal<ScoreWithMeta | null>(null);

  const auth = useAuth();

  // Use createResource for automatic loading/error state management
  const [heat] = createResource(
    () => ({ heatId: props.heatId, trigger: refreshTrigger() }),
    async ({ heatId }) => {
      const data = await apiGet<Heat>(`/api/heats/${heatId}`);
      return data;
    }
  );

  // Separate resource for riders
  const [riders] = createResource(
    () => heat()?.riderIds,
    async (riderIds) => {
      if (!riderIds || riderIds.length === 0) return {};
      const riderMap: Record<string, Rider> = {};
      for (const riderId of riderIds) {
        try {
          const rider = await apiGet<Rider>(`/api/riders/${riderId}`);
          riderMap[riderId] = rider;
        } catch (err) {
          console.error(`Error loading rider ${riderId}:`, err);
        }
      }
      return riderMap;
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

  // Helper to refresh heat data
  const refreshHeat = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Get scores for a specific rider and type, filtered by current judge
  const getScoresForRider = (riderId: string, type: "wave" | "jump") => {
    const currentHeat = heat();
    const currentUser = auth.user();
    if (!currentHeat || !currentUser) return [];

    const filtered = currentHeat.scores
      .filter((s) => {
        // Filter by rider, type, and current judge
        return s.riderId === riderId && s.type === type && s.judgeId === currentUser.id;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return filtered as ScoreWithMeta[];
  };

  // Open wave modal for adding
  const openWaveModal = (riderId: string) => {
    if (!isOnline()) return;
    setSelectedRiderId(riderId);
    setEditingScore(null);
    setWaveModalOpen(true);
  };

  // Open jump modal for adding
  const openJumpModal = (riderId: string) => {
    if (!isOnline()) return;
    setSelectedRiderId(riderId);
    setEditingScore(null);
    setJumpModalOpen(true);
  };

  // Open wave modal for editing
  const editWaveScore = (riderId: string, score: ScoreWithMeta) => {
    if (!isOnline()) return;
    setSelectedRiderId(riderId);
    setEditingScore(score);
    setWaveModalOpen(true);
  };

  // Open jump modal for editing
  const editJumpScore = (riderId: string, score: ScoreWithMeta) => {
    if (!isOnline()) return;
    setSelectedRiderId(riderId);
    setEditingScore(score);
    setJumpModalOpen(true);
  };

  // Handle wave score submission
  const handleWaveScoreSubmit = async (score: number) => {
    const riderId = selectedRiderId();
    if (!riderId) return;

    const editing = editingScore();
    if (editing) {
      // Update existing score
      await apiPut(`/api/heats/${props.heatId}/scores/wave/${editing.scoreUUID}`, {
        heatId: props.heatId,
        waveScore: score,
      });
    } else {
      // Add new score
      const scoreUUID = crypto.randomUUID();
      await apiPost(`/api/heats/${props.heatId}/scores/wave`, {
        heatId: props.heatId,
        scoreUUID,
        riderId,
        waveScore: score,
      });
    }

    // Refetch heat data
    refreshHeat();
  };

  // Handle jump score submission
  const handleJumpScoreSubmit = async (
    score: number,
    jumpType: JumpType,
    modifiers: JumpModifier[]
  ) => {
    const riderId = selectedRiderId();
    if (!riderId) return;

    const editing = editingScore();
    if (editing) {
      // Update existing score
      await apiPut(`/api/heats/${props.heatId}/scores/jump/${editing.scoreUUID}`, {
        heatId: props.heatId,
        jumpScore: score,
        jumpType,
        modifiers,
      });
    } else {
      // Add new score
      const scoreUUID = crypto.randomUUID();
      await apiPost(`/api/heats/${props.heatId}/scores/jump`, {
        heatId: props.heatId,
        scoreUUID,
        riderId,
        jumpScore: score,
        jumpType,
        modifiers,
      });
    }

    // Refetch heat data
    refreshHeat();
  };

  // Handle wave score deletion
  const handleDeleteWaveScore = async (scoreUUID: string) => {
    if (!confirm("Are you sure you want to delete this wave score?")) {
      return;
    }

    try {
      await apiDelete(`/api/heats/${props.heatId}/scores/wave/${scoreUUID}`);
      refreshHeat();
    } catch (err) {
      console.error("Error deleting wave score:", err);
      alert(err instanceof Error ? err.message : "Failed to delete wave score");
    }
  };

  // Handle jump score deletion
  const handleDeleteJumpScore = async (scoreUUID: string) => {
    if (!confirm("Are you sure you want to delete this jump score?")) {
      return;
    }

    try {
      await apiDelete(`/api/heats/${props.heatId}/scores/jump/${scoreUUID}`);
      refreshHeat();
    } catch (err) {
      console.error("Error deleting jump score:", err);
      alert(err instanceof Error ? err.message : "Failed to delete jump score");
    }
  };

  // Handle finish heat
  const handleFinishHeat = async () => {
    if (!confirm("Are you sure you want to finish this heat? This cannot be undone.")) {
      return;
    }

    try {
      await apiPost(`/api/heats/${props.heatId}/complete`, {});
      refreshHeat();
    } catch (err) {
      console.error("Error completing heat:", err);
      alert(err instanceof Error ? err.message : "Failed to complete heat");
    }
  };

  // Get rider name
  const getRiderName = (riderId: string): string => {
    const riderMap = riders();
    const rider = riderMap?.[riderId];
    if (!rider) return "Unknown Rider";
    return `${rider.firstName} ${rider.lastName}`;
  };

  // Get rider sail number
  const getRiderSailNumber = (riderId: string): string => {
    const riderMap = riders();
    const rider = riderMap?.[riderId];
    return rider?.sailNumber || "N/A";
  };

  return (
    <Show
      when={!heat.loading}
      fallback={
        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
          <div class="text-center">
            <div class="text-lg font-semibold text-gray-900">Loading heat...</div>
            <div class="text-sm text-gray-600 mt-2">Please wait</div>
          </div>
        </div>
      }
    >
      <Show
        when={!heat.error}
        fallback={
          <div class="min-h-screen bg-gray-50 flex items-center justify-center">
            <div class="text-center">
              <div class="text-lg font-semibold text-red-600">Error</div>
              <div class="text-sm text-gray-600 mt-2">
                {heat.error?.message || "Failed to load heat"}
              </div>
              <Button variant="primary" onClick={() => refreshHeat()} class="mt-4">
                Retry
              </Button>
            </div>
          </div>
        }
      >
        <Show
          when={heat()}
          fallback={
            <div class="min-h-screen bg-gray-50 flex items-center justify-center">
              <div class="text-center">
                <div class="text-lg font-semibold text-gray-900">Heat not found</div>
              </div>
            </div>
          }
        >
          {(currentHeat: () => Heat) => {
            const s = selectedRiderId();
            const riderMap = riders();
            const selectedRider = s && riderMap ? riderMap[s] : null;
            const selectedRiderColor = s ? getRiderColor(s) : "#000000";

            return (
              <div class="min-h-screen bg-gray-50 pb-20">
                {/* Connection Status */}
                <ConnectionStatusIndicator isOnline={isOnline()} />

                {/* Header */}
                <div class="bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-start">
                  <div>
                    <Heading level={1}>
                      {currentHeat().roundName} - Heat {currentHeat().position}
                    </Heading>
                    <div class="text-sm text-gray-600 mt-1">
                      Rules: Best {currentHeat().heatRules.wavesCounting} waves, Best{" "}
                      {currentHeat().heatRules.jumpsCounting} jumps
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Show when={auth.isHeadJudgeOrAdmin()}>
                      <a
                        href={`/head-judge/heats/${props.heatId}`}
                        class="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Head Judge View →
                      </a>
                    </Show>
                    <a
                      href={getViewerUrl(props.heatId)}
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
                  </div>
                </div>

                {/* Rider Score Cards */}
                <div class="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <For each={currentHeat().riderIds}>
                    {(riderId) => {
                      const riderColor = getRiderColor(riderId);
                      const waveScores = getScoresForRider(riderId, "wave");
                      const jumpScores = getScoresForRider(riderId, "jump");

                      return (
                        <div class="bg-white rounded-lg shadow-md overflow-hidden">
                          {/* Rider Header */}
                          <div
                            class="px-4 py-3 text-white flex justify-between items-center"
                            style={{ "background-color": riderColor }}
                          >
                            <div>
                              <div class="font-bold text-lg">{getRiderName(riderId)}</div>
                              <div class="text-sm opacity-90">
                                Sail: {getRiderSailNumber(riderId)}
                              </div>
                            </div>
                            <div class="text-right">
                              <div class="font-bold text-lg">
                                {(currentHeat().riderTotals[riderId] ?? 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Scores Grid */}
                          <div class="grid grid-cols-2 divide-x divide-gray-200">
                            {/* WAVES Column */}
                            <div class="p-4">
                              <div class="w-full text-left mb-3 font-semibold text-gray-900">
                                WAVES
                              </div>
                              <div class="space-y-2">
                                <button
                                  type="button"
                                  onClick={() => openWaveModal(riderId)}
                                  disabled={!isOnline()}
                                  class="w-full py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:text-blue-600 disabled:hover:border-gray-300 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                                >
                                  Tap to add wave
                                </button>
                                <For each={waveScores}>
                                  {(score) => {
                                    const classString = `w-full text-left p-3 rounded-md hover:bg-blue-50 hover:border-blue-300 border disabled:hover:bg-gray-50 disabled:hover:border-gray-200 disabled:cursor-not-allowed ${
                                      score.isCounting
                                        ? "bg-blue-50 border-blue-400 border-2"
                                        : "bg-gray-50 border-gray-200"
                                    }`;
                                    return (
                                      <div class="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => editWaveScore(riderId, score)}
                                          disabled={!isOnline()}
                                          class={`flex-1 ${classString}`}
                                        >
                                          <div class="flex items-center gap-2">
                                            <div class="font-bold text-xl text-gray-900">
                                              {score.scoreValue.toFixed(2)}
                                            </div>
                                          </div>
                                          <div class="text-xs text-gray-500 mt-1">
                                            {formatTimestamp(score.timestamp)}
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteWaveScore(score.scoreUUID);
                                          }}
                                          disabled={!isOnline()}
                                          class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                          title="Delete score"
                                          aria-label="Delete score"
                                        >
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            aria-hidden="true"
                                          >
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                          </svg>
                                        </button>
                                      </div>
                                    );
                                  }}
                                </For>
                              </div>
                            </div>

                            {/* JUMPS Column */}
                            <div class="p-4">
                              <div class="w-full text-left mb-3 font-semibold text-gray-900">
                                JUMPS
                              </div>
                              <div class="space-y-2">
                                <button
                                  type="button"
                                  onClick={() => openJumpModal(riderId)}
                                  disabled={!isOnline()}
                                  class="w-full py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:text-blue-600 disabled:hover:border-gray-300 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                                >
                                  Tap to add jump
                                </button>
                                <For each={jumpScores}>
                                  {(score) => {
                                    const classString = `w-full text-left p-3 rounded-md hover:bg-blue-50 hover:border-blue-300 border disabled:hover:bg-gray-50 disabled:hover:border-gray-200 disabled:cursor-not-allowed ${
                                      score.isCounting
                                        ? "bg-blue-50 border-blue-400 border-2"
                                        : "bg-gray-50 border-gray-200"
                                    }`;
                                    return (
                                      <div class="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => editJumpScore(riderId, score)}
                                          disabled={!isOnline()}
                                          class={`flex-1 ${classString}`}
                                        >
                                          <div class="flex items-center gap-2">
                                            <div class="font-bold text-xl text-gray-900">
                                              {score.scoreValue.toFixed(2)}{" "}
                                              <span class="text-sm font-normal text-gray-600">
                                                (
                                                {score.jumpType
                                                  ? formatJumpType(score.jumpType as JumpType)
                                                  : ""}
                                                {score.modifiers
                                                  ? formatModifiers(
                                                      score.modifiers as JumpModifier[]
                                                    )
                                                  : ""}
                                                )
                                              </span>
                                            </div>
                                          </div>
                                          <div class="text-xs text-gray-500 mt-1">
                                            {formatTimestamp(score.timestamp)}
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteJumpScore(score.scoreUUID);
                                          }}
                                          disabled={!isOnline()}
                                          class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                          title="Delete score"
                                          aria-label="Delete score"
                                        >
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            aria-hidden="true"
                                          >
                                            <path d="M3 6h18"></path>
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                          </svg>
                                        </button>
                                      </div>
                                    );
                                  }}
                                </For>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>

                {/* Finish Heat Button (Head Judge Only) */}
                <Show
                  when={(auth.isHeadJudgeOrAdmin() || auth.isJudge()) && !currentHeat().completedAt}
                >
                  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                    <Button
                      variant="success"
                      fullWidth
                      disabled={!isOnline()}
                      onClick={handleFinishHeat}
                      size="lg"
                    >
                      Finish Heat
                    </Button>
                  </div>
                </Show>

                {/* Heat Completed Banner */}
                <Show when={currentHeat().completedAt}>
                  <div class="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 p-4">
                    <div class="text-center text-green-800 font-semibold">Heat Completed</div>
                  </div>
                </Show>

                {/* Wave Score Modal */}
                <WaveScoreModal
                  isOpen={waveModalOpen()}
                  onClose={() => setWaveModalOpen(false)}
                  riderId={selectedRiderId() || ""}
                  riderName={
                    selectedRider ? `${selectedRider.firstName} ${selectedRider.lastName}` : ""
                  }
                  riderColor={selectedRiderColor}
                  onSubmit={handleWaveScoreSubmit}
                  initialValue={
                    editingScore()?.type === "wave" ? editingScore()?.scoreValue : undefined
                  }
                  mode={editingScore() ? "edit" : "add"}
                />

                {/* Jump Score Modal */}
                <JumpScoreModal
                  isOpen={jumpModalOpen()}
                  onClose={() => setJumpModalOpen(false)}
                  riderId={selectedRiderId() || ""}
                  riderName={
                    selectedRider ? `${selectedRider.firstName} ${selectedRider.lastName}` : ""
                  }
                  riderColor={selectedRiderColor}
                  onSubmit={handleJumpScoreSubmit}
                  initialValue={
                    editingScore()?.type === "jump"
                      ? {
                          score: editingScore()?.scoreValue ?? 0,
                          jumpType: (editingScore()?.jumpType || "forward") as JumpType,
                          modifiers: editingScore()?.modifiers
                            ? (editingScore()?.modifiers as JumpModifier[])
                            : [],
                        }
                      : undefined
                  }
                  mode={editingScore() ? "edit" : "add"}
                />
              </div>
            );
          }}
        </Show>
      </Show>
    </Show>
  );
};

export default HeatScoreSheet;
