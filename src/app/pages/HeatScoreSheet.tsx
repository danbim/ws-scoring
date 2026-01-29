import type { Component } from "solid-js";
import { createEffect, createResource, createSignal, For, Show } from "solid-js";
import type { JumpModifier, JumpType } from "@/domain/heat/types";
import ConnectionStatusIndicator from "../components/ConnectionStatusIndicator";
import JumpScoreModal from "../components/JumpScoreModal";
import RiderScoreCard from "../components/RiderScoreCard";
import type { ScoreWithMeta } from "../components/ScoreColumn";
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
      await apiPut(`/api/heats/${props.heatId}/scores/wave/${editing.scoreUUID}`, {
        heatId: props.heatId,
        waveScore: score,
      });
    } else {
      const scoreUUID = crypto.randomUUID();
      await apiPost(`/api/heats/${props.heatId}/scores/wave`, {
        heatId: props.heatId,
        scoreUUID,
        riderId,
        waveScore: score,
      });
    }

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
      await apiPut(`/api/heats/${props.heatId}/scores/jump/${editing.scoreUUID}`, {
        heatId: props.heatId,
        jumpScore: score,
        jumpType,
        modifiers,
      });
    } else {
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
                    {(riderId) => (
                      <RiderScoreCard
                        riderName={getRiderName(riderId)}
                        sailNumber={getRiderSailNumber(riderId)}
                        riderColor={getRiderColor(riderId)}
                        riderTotal={currentHeat().riderTotals[riderId] ?? 0}
                        waveScores={getScoresForRider(riderId, "wave")}
                        jumpScores={getScoresForRider(riderId, "jump")}
                        isOnline={isOnline()}
                        onAddWave={() => openWaveModal(riderId)}
                        onAddJump={() => openJumpModal(riderId)}
                        onEditWave={(score) => editWaveScore(riderId, score)}
                        onEditJump={(score) => editJumpScore(riderId, score)}
                        onDeleteWave={handleDeleteWaveScore}
                        onDeleteJump={handleDeleteJumpScore}
                      />
                    )}
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
