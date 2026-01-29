# Component Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract `ScoreColumn`, `RiderScoreCard`, and `BracketSection` components to reduce `HeatScoreSheet.tsx` from 668 to ~350 lines and `Divisions.tsx` from 656 to ~250 lines.

**Architecture:** Pure frontend refactor. Extract JSX and related state into focused sub-components. No logic changes, no API changes, no new patterns. Components go in `src/app/components/`.

**Tech Stack:** SolidJS, TypeScript, Biome (formatting/linting)

---

### Task 1: Create `ScoreColumn` component

**Files:**
- Create: `src/app/components/ScoreColumn.tsx`

**Step 1: Create `ScoreColumn.tsx`**

This component renders one column of scores (wave or jump) for a single rider. It contains the format helpers (`formatJumpType`, `formatModifiers`, `formatTimestamp`) and all the score card JSX previously inlined in HeatScoreSheet.

```tsx
import type { Component } from "solid-js";
import { For } from "solid-js";
import type { JumpModifier, JumpType } from "@/domain/heat/types";

export interface ScoreWithMeta {
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

function formatModifiers(modifiers: JumpModifier[]): string {
  if (!modifiers || modifiers.length === 0) return "";
  const mapping: Record<JumpModifier, string> = {
    oneHanded: "OH",
    oneFooted: "OF",
  };
  return `+${modifiers.map((m) => mapping[m]).join("+")}`;
}

function formatTimestamp(timestamp: string | Date): string {
  const timestampDate = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const seconds = Math.floor((Date.now() - timestampDate.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

interface ScoreColumnProps {
  type: "wave" | "jump";
  scores: ScoreWithMeta[];
  isOnline: boolean;
  onAdd: () => void;
  onEdit: (score: ScoreWithMeta) => void;
  onDelete: (scoreUUID: string) => void;
}

const ScoreColumn: Component<ScoreColumnProps> = (props) => {
  return (
    <div class="p-4">
      <div class="w-full text-left mb-3 font-semibold text-gray-900">
        {props.type === "wave" ? "WAVES" : "JUMPS"}
      </div>
      <div class="space-y-2">
        <button
          type="button"
          onClick={() => props.onAdd()}
          disabled={!props.isOnline}
          class="w-full py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:text-blue-600 disabled:hover:border-gray-300 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
        >
          Tap to add {props.type}
        </button>
        <For each={props.scores}>
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
                  onClick={() => props.onEdit(score)}
                  disabled={!props.isOnline}
                  class={`flex-1 ${classString}`}
                >
                  <div class="flex items-center gap-2">
                    <div class="font-bold text-xl text-gray-900">
                      {score.scoreValue.toFixed(2)}
                      {props.type === "jump" && (
                        <span class="text-sm font-normal text-gray-600">
                          {" "}(
                          {score.jumpType
                            ? formatJumpType(score.jumpType as JumpType)
                            : ""}
                          {score.modifiers
                            ? formatModifiers(score.modifiers as JumpModifier[])
                            : ""}
                          )
                        </span>
                      )}
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
                    props.onDelete(score.scoreUUID);
                  }}
                  disabled={!props.isOnline}
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
  );
};

export default ScoreColumn;
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: PASS (new file, no consumers yet)

**Step 3: Commit**

```bash
git add src/app/components/ScoreColumn.tsx
git commit -m "(refactor) extract ScoreColumn component from HeatScoreSheet"
```

---

### Task 2: Create `RiderScoreCard` component

**Files:**
- Create: `src/app/components/RiderScoreCard.tsx`

**Step 1: Create `RiderScoreCard.tsx`**

This component renders the full card for one rider: colored header bar with name/sail/total, plus two `ScoreColumn` instances in a grid.

```tsx
import type { Component } from "solid-js";
import ScoreColumn from "./ScoreColumn";
import type { ScoreWithMeta } from "./ScoreColumn";

interface RiderScoreCardProps {
  riderName: string;
  sailNumber: string;
  riderColor: string;
  riderTotal: number;
  waveScores: ScoreWithMeta[];
  jumpScores: ScoreWithMeta[];
  isOnline: boolean;
  onAddWave: () => void;
  onAddJump: () => void;
  onEditWave: (score: ScoreWithMeta) => void;
  onEditJump: (score: ScoreWithMeta) => void;
  onDeleteWave: (scoreUUID: string) => void;
  onDeleteJump: (scoreUUID: string) => void;
}

const RiderScoreCard: Component<RiderScoreCardProps> = (props) => {
  return (
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Rider Header */}
      <div
        class="px-4 py-3 text-white flex justify-between items-center"
        style={{ "background-color": props.riderColor }}
      >
        <div>
          <div class="font-bold text-lg">{props.riderName}</div>
          <div class="text-sm opacity-90">Sail: {props.sailNumber}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-lg">{props.riderTotal.toFixed(2)}</div>
        </div>
      </div>

      {/* Scores Grid */}
      <div class="grid grid-cols-2 divide-x divide-gray-200">
        <ScoreColumn
          type="wave"
          scores={props.waveScores}
          isOnline={props.isOnline}
          onAdd={props.onAddWave}
          onEdit={props.onEditWave}
          onDelete={props.onDeleteWave}
        />
        <ScoreColumn
          type="jump"
          scores={props.jumpScores}
          isOnline={props.isOnline}
          onAdd={props.onAddJump}
          onEdit={props.onEditJump}
          onDelete={props.onDeleteJump}
        />
      </div>
    </div>
  );
};

export default RiderScoreCard;
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: PASS (new file, no consumers yet)

**Step 3: Commit**

```bash
git add src/app/components/RiderScoreCard.tsx
git commit -m "(refactor) extract RiderScoreCard component from HeatScoreSheet"
```

---

### Task 3: Refactor `HeatScoreSheet.tsx` to use extracted components

**Files:**
- Modify: `src/app/pages/HeatScoreSheet.tsx`

**Step 1: Rewrite `HeatScoreSheet.tsx`**

Remove the `ScoreWithMeta` interface (import from `ScoreColumn`), remove the three format helper functions, remove the inline rider card JSX, and replace with `<RiderScoreCard>`. The data fetching, modal state, submission handlers, loading/error states, header, modals, and finish button all remain.

Replace the entire file with the following. Key changes from original:
- Import `RiderScoreCard` and `ScoreWithMeta` from new components
- Remove `ScoreWithMeta` interface definition (lines 23-33)
- Remove `formatJumpType`, `formatModifiers`, `formatTimestamp` functions (lines 35-75)
- Replace the 180-line rider card JSX block (lines 411-592) with `<RiderScoreCard>` usage

```tsx
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
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Run all tests**

Run: `bun run test:all`
Expected: All tests pass (no component tests exist for HeatScoreSheet, but verify no regressions)

**Step 4: Format and lint**

Run: `bun format && bun check:fix`
Expected: Clean

**Step 5: Commit**

```bash
git add src/app/pages/HeatScoreSheet.tsx
git commit -m "(refactor) use RiderScoreCard and ScoreColumn in HeatScoreSheet"
```

---

### Task 4: Create `BracketSection` component

**Files:**
- Create: `src/app/components/BracketSection.tsx`

**Step 1: Create `BracketSection.tsx`**

This component owns all bracket and heat state, data loading, CRUD handlers, and related modals. It receives `divisionId`, routing props, and `participants` from the parent.

```tsx
import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import type { Bracket, Heat, Rider } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import EntityFormModal from "./EntityFormModal";
import HeatCreationForm from "./HeatCreationForm";
import SingleEliminationBracketView from "./SingleEliminationBracketView";
import Button from "./ui/Button";
import Heading from "./ui/Heading";

interface BracketSectionProps {
  divisionId: string;
  seasonId: string;
  contestId: string;
  participants: Rider[];
  onParticipantsChanged: () => void;
}

const BracketSection: Component<BracketSectionProps> = (props) => {
  const [brackets, setBrackets] = createSignal<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = createSignal<Bracket | null>(null);
  const [heats, setHeats] = createSignal<Heat[]>([]);
  const [showGenerateBracketModal, setShowGenerateBracketModal] = createSignal(false);
  const [showCreateBracketModal, setShowCreateBracketModal] = createSignal(false);
  const [editingBracket, setEditingBracket] = createSignal<Bracket | null>(null);
  const [deletingBracket, setDeletingBracket] = createSignal<Bracket | null>(null);
  const [showHeatForm, setShowHeatForm] = createSignal(false);
  const [editingHeat, setEditingHeat] = createSignal<Heat | null>(null);
  const [deletingHeat, setDeletingHeat] = createSignal<Heat | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();

  const loadBrackets = async () => {
    try {
      const data = await apiGet<{ brackets: Bracket[] }>(
        `/api/brackets?divisionId=${props.divisionId}`
      );
      setBrackets(data.brackets);
      if (data.brackets.length > 0 && !selectedBracket()) {
        setSelectedBracket(data.brackets[0]);
      }
    } catch (error) {
      console.error("Error loading brackets:", error);
    }
  };

  const loadHeats = async () => {
    const bracket = selectedBracket();
    if (!bracket) return;
    try {
      const data = await apiGet<{ heats: Heat[] }>(`/api/heats?bracketId=${bracket.id}`);
      setHeats(data.heats);
    } catch (error) {
      console.error("Error loading heats:", error);
    }
  };

  // Load brackets when divisionId changes
  createEffect(() => {
    const _divisionId = props.divisionId;
    setSelectedBracket(null);
    setHeats([]);
    loadBrackets();
  });

  // Load heats when bracket changes
  createEffect(() => {
    if (selectedBracket()) {
      loadHeats();
    }
  });

  const getHeatRiders = (heat: Heat): Rider[] => {
    return heat.riderIds
      .map((id) => props.participants.find((r) => r.id === id))
      .filter((r): r is Rider => r !== undefined);
  };

  const handleGenerateBracket = async (formData: Record<string, unknown>) => {
    try {
      await apiPost(`/api/divisions/${props.divisionId}/brackets/generate`, { ...formData });
      setShowGenerateBracketModal(false);
      loadBrackets();
    } catch (error) {
      console.error("Error creating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to create bracket");
    }
  };

  const handleCreateBracket = async (formData: Record<string, unknown>) => {
    try {
      await apiPost("/api/brackets", { ...formData, divisionId: props.divisionId });
      setShowCreateBracketModal(false);
      loadBrackets();
    } catch (error) {
      console.error("Error creating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to create bracket");
    }
  };

  const handleUpdateBracket = async (formData: Record<string, unknown>) => {
    const bracket = editingBracket();
    if (!bracket) return;
    try {
      await apiPut(`/api/brackets/${bracket.id}`, formData);
      setEditingBracket(null);
      loadBrackets();
    } catch (error) {
      console.error("Error updating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to update bracket");
    }
  };

  const handleDeleteBracket = async () => {
    const bracket = deletingBracket();
    if (!bracket) return;
    try {
      await apiDelete(`/api/brackets/${bracket.id}`);
      setDeletingBracket(null);
      loadBrackets();
    } catch (error) {
      console.error("Error deleting bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to delete bracket");
    }
  };

  const bracketFields = [
    { name: "name", label: "Name", type: "text" as const, required: true },
    {
      name: "format",
      label: "Format",
      type: "select" as const,
      required: true,
      options: [
        { value: "single_elimination", label: "Single Elimination" },
        { value: "double_elimination", label: "Double Elimination" },
        { value: "dingle", label: "Dingle" },
      ],
    },
    { name: "status", label: "Status", type: "text" as const, required: true },
  ];

  return (
    <div class="mt-6">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <Heading level={3}>Brackets</Heading>
        {auth.isHeadJudgeOrAdmin() && (
          <div class="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              fullWidth="responsive"
              onClick={() => setShowGenerateBracketModal(true)}
            >
              Generate Bracket
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth="responsive"
              onClick={() => setShowCreateBracketModal(true)}
            >
              Manually Create Bracket
            </Button>
          </div>
        )}
      </div>

      {brackets().length === 0 ? (
        <p class="text-xs sm:text-sm text-gray-500">No brackets in this division yet.</p>
      ) : (
        <>
          <div class="mb-4">
            <label
              for="bracket-select-division"
              class="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
            >
              Select Bracket:
            </label>
            <select
              id="bracket-select-division"
              value={selectedBracket()?.id || ""}
              onChange={(e) => {
                const bracket = brackets().find((b) => b.id === e.currentTarget.value);
                setSelectedBracket(bracket || null);
              }}
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {brackets().map((bracket) => (
                <option value={bracket.id}>{bracket.name}</option>
              ))}
            </select>
          </div>

          {selectedBracket() && (
            <div class="bg-white rounded-lg shadow p-4 sm:p-6">
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <Heading level={4}>{selectedBracket()?.name}</Heading>
                {auth.isHeadJudgeOrAdmin() && (
                  <div class="flex flex-wrap gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => setShowHeatForm(true)}
                    >
                      Create Heat
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const bracket = selectedBracket();
                        if (bracket) setEditingBracket(bracket);
                      }}
                    >
                      Edit Bracket
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const bracket = selectedBracket();
                        if (bracket) setDeletingBracket(bracket);
                      }}
                    >
                      Delete Bracket
                    </Button>
                  </div>
                )}
              </div>

              {/* Bracket or Heats */}
              <div class="mt-4">
                <Heading level={5} class="mb-3">
                  {selectedBracket() ? "Bracket" : "Heats"}
                </Heading>

                <Show
                  when={
                    selectedBracket()?.format === "single_elimination"
                      ? selectedBracket()
                      : undefined
                  }
                >
                  {(bracket) => (
                    <SingleEliminationBracketView
                      bracket={bracket()}
                      heats={heats()}
                      participants={props.participants}
                      seasonId={props.seasonId}
                      contestId={props.contestId}
                      divisionId={props.divisionId}
                      onHeatUpdate={() => {
                        loadHeats();
                        props.onParticipantsChanged();
                      }}
                    />
                  )}
                </Show>

                <Show when={selectedBracket()?.format === "double_elimination"}>
                  <p class="text-sm text-gray-500">
                    Double elimination view coming soon...
                  </p>
                </Show>

                <Show when={selectedBracket()?.format === "dingle"}>
                  <p class="text-sm text-gray-500">Dingle format view coming soon...</p>
                </Show>

                <Show when={!selectedBracket()}>
                  {heats().length === 0 ? (
                    <p class="text-xs sm:text-sm text-gray-500">
                      No heats in this bracket yet.
                    </p>
                  ) : (
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {heats().map((heat) => (
                        <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                          <button
                            type="button"
                            class="cursor-pointer hover:bg-gray-100 transition-colors text-left w-full"
                            onClick={() => {
                              const bracket = selectedBracket();
                              if (bracket) {
                                navigate(
                                  `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${props.divisionId}/brackets/${bracket.id}/heats/${heat.heatId}`
                                );
                              }
                            }}
                            aria-label={`View ${heat.roundName} - Heat ${heat.position}`}
                          >
                            <Heading level={6}>
                              {heat.roundName} - Heat {heat.position}
                            </Heading>
                            <div class="mt-2 space-y-1">
                              {getHeatRiders(heat).map((rider) => (
                                <p class="text-xs sm:text-sm text-gray-700">
                                  {rider.firstName} {rider.lastName}
                                  {rider.sailNumber && ` (${rider.sailNumber})`}
                                </p>
                              ))}
                            </div>
                            <p class="text-xs sm:text-sm text-gray-500 mt-2">
                              Rules: {heat.heatRules.wavesCounting} waves,{" "}
                              {heat.heatRules.jumpsCounting} jumps | Scores:{" "}
                              {heat.scores.length}
                            </p>
                          </button>
                          {auth.isHeadJudgeOrAdmin() && (
                            <div class="mt-2 sm:mt-3 flex space-x-2">
                              <Button
                                variant="text"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingHeat(heat);
                                  setShowHeatForm(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger-text"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingHeat(heat);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Show>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bracket Modals */}
      <EntityFormModal
        isOpen={showGenerateBracketModal()}
        title="Generate Bracket"
        entity={null}
        onSave={handleGenerateBracket}
        onCancel={() => setShowGenerateBracketModal(false)}
        fields={bracketFields}
      />

      <EntityFormModal
        isOpen={showCreateBracketModal()}
        title="Create Bracket"
        entity={null}
        onSave={handleCreateBracket}
        onCancel={() => setShowCreateBracketModal(false)}
        fields={bracketFields}
      />

      <EntityFormModal
        isOpen={editingBracket() !== null}
        title="Edit Bracket"
        entity={editingBracket()}
        onSave={handleUpdateBracket}
        onCancel={() => setEditingBracket(null)}
        fields={bracketFields}
      />

      <DeleteConfirmationModal
        isOpen={deletingBracket() !== null}
        entityName={deletingBracket()?.name || ""}
        entityType="bracket"
        onConfirm={handleDeleteBracket}
        onCancel={() => setDeletingBracket(null)}
      />

      {/* Heat Form */}
      <Show when={showHeatForm() && selectedBracket()}>
        <HeatCreationForm
          bracketId={selectedBracket()?.id || ""}
          participants={props.participants}
          heat={editingHeat()}
          onClose={() => {
            setShowHeatForm(false);
            setEditingHeat(null);
          }}
          onSuccess={() => {
            setShowHeatForm(false);
            setEditingHeat(null);
            loadHeats();
          }}
        />
      </Show>

      {/* Heat Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deletingHeat() !== null}
        entityName={(() => {
          const heat = deletingHeat();
          return heat ? `${heat.roundName} - Heat ${heat.position}` : "";
        })()}
        entityType="heat"
        onConfirm={async () => {
          if (deletingHeat()) {
            try {
              const heat = deletingHeat();
              if (heat) {
                await apiDelete(`/api/heats/${heat.heatId}`);
              }
              setDeletingHeat(null);
              loadHeats();
            } catch (error) {
              console.error("Error deleting heat:", error);
              alert(error instanceof Error ? error.message : "Failed to delete heat");
            }
          }
        }}
        onCancel={() => setDeletingHeat(null)}
      />
    </div>
  );
};

export default BracketSection;
```

**Notes for implementor:**
- The original `Divisions.tsx` had `loadBrackets` referencing `selectedDivision()` — here it uses `props.divisionId` directly since the parent passes the selected division's ID.
- The original `onHeatUpdate` callback in `SingleEliminationBracketView` called both `loadHeats()` and `loadParticipants()`. Since participants are owned by the parent, we call `props.onParticipantsChanged()` to let the parent reload participants.
- The `createEffect` that resets bracket state uses `props.divisionId` as the reactive dependency instead of `selectedDivision()`.

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: PASS (new file, no consumers yet)

**Step 3: Commit**

```bash
git add src/app/components/BracketSection.tsx
git commit -m "(refactor) extract BracketSection component from Divisions"
```

---

### Task 5: Refactor `Divisions.tsx` to use `BracketSection`

**Files:**
- Modify: `src/app/pages/Divisions.tsx`

**Step 1: Rewrite `Divisions.tsx`**

Remove all bracket/heat state, loading functions, CRUD handlers, and modals. Replace the bracket section JSX with `<BracketSection>`. Keep division state, loading, CRUD, tabs, and division modals.

Replace the entire file with:

```tsx
import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createSignal, onMount } from "solid-js";
import BracketSection from "../components/BracketSection";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import Button from "../components/ui/Button";
import Heading from "../components/ui/Heading";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import type { Division, Rider } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";

interface DivisionsProps {
  seasonId: string;
  contestId: string;
}

const Divisions: Component<DivisionsProps> = (props) => {
  const [divisions, setDivisions] = createSignal<Division[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedTab, setSelectedTab] = createSignal<string | null>(null);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingDivision, setEditingDivision] = createSignal<Division | null>(null);
  const [deletingDivision, setDeletingDivision] = createSignal<Division | null>(null);
  const [participants, setParticipants] = createSignal<Rider[]>([]);

  const auth = useAuth();
  const navigate = useNavigate();

  const loadDivisions = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ divisions: Division[] }>(
        `/api/divisions?contestId=${props.contestId}`
      );
      setDivisions(data.divisions);
      if (data.divisions.length > 0 && !selectedTab()) {
        setSelectedTab(data.divisions[0].id);
      }
    } catch (error) {
      console.error("Error loading divisions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    const division = selectedDivision();
    if (!division) return;
    try {
      const data = await apiGet<{ riders: Rider[] }>(`/api/divisions/${division.id}/participants`);
      setParticipants(data.riders);
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  onMount(() => {
    loadDivisions();
  });

  createEffect(() => {
    if (selectedDivision()) {
      loadParticipants();
    }
  });

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await apiPost("/api/divisions", { ...formData, contestId: props.contestId });
      setShowCreateModal(false);
      loadDivisions();
    } catch (error) {
      console.error("Error creating division:", error);
      alert(error instanceof Error ? error.message : "Failed to create division");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const division = editingDivision();
    if (!division) return;
    try {
      await apiPut(`/api/divisions/${division.id}`, formData);
      setEditingDivision(null);
      loadDivisions();
    } catch (error) {
      console.error("Error updating division:", error);
      alert(error instanceof Error ? error.message : "Failed to update division");
    }
  };

  const handleDelete = async () => {
    const division = deletingDivision();
    if (!division) return;
    try {
      await apiDelete(`/api/divisions/${division.id}`);
      setDeletingDivision(null);
      loadDivisions();
    } catch (error) {
      console.error("Error deleting division:", error);
      alert(error instanceof Error ? error.message : "Failed to delete division");
    }
  };

  const divisionFields = [
    { name: "name", label: "Name", type: "text" as const, required: true },
    {
      name: "category",
      label: "Category",
      type: "select" as const,
      required: true,
      options: [
        { value: "pro_men", label: "Pro Men" },
        { value: "pro_women", label: "Pro Women" },
        { value: "amateur_men", label: "Amateur Men" },
        { value: "amateur_women", label: "Amateur Women" },
        { value: "pro_youth", label: "Pro Youth" },
        { value: "amateur_youth", label: "Amateur Youth" },
        { value: "pro_masters", label: "Pro Masters" },
        { value: "amateur_masters", label: "Amateur Masters" },
      ],
    },
  ];

  const selectedDivision = () => divisions().find((d) => d.id === selectedTab());

  return (
    <div>
      <PageHeader
        action={
          auth.isHeadJudgeOrAdmin() && (
            <Button
              variant="primary"
              fullWidth="responsive"
              onClick={() => setShowCreateModal(true)}
            >
              Create Division
            </Button>
          )
        }
      >
        Divisions
      </PageHeader>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <>
          <div class="border-b border-gray-200 overflow-x-auto">
            <nav class="-mb-px flex space-x-4 sm:space-x-8">
              {divisions().map((division) => (
                <button
                  type="button"
                  onClick={() => setSelectedTab(division.id)}
                  class={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                    selectedTab() === division.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {division.name}
                </button>
              ))}
            </nav>
          </div>

          {selectedDivision() && (
            <div class="mt-4 sm:mt-6">
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <Heading level={2}>{selectedDivision()?.name}</Heading>
                <div class="flex flex-wrap gap-2">
                  {auth.isHeadJudgeOrAdmin() && (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          const division = selectedDivision();
                          if (division) {
                            navigate(
                              `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${division.id}/participants`
                            );
                          }
                        }}
                      >
                        Edit Participants
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          const division = selectedDivision();
                          if (division) setEditingDivision(division);
                        }}
                      >
                        Edit Division
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          const division = selectedDivision();
                          if (division) setDeletingDivision(division);
                        }}
                      >
                        Delete Division
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <BracketSection
                divisionId={selectedDivision()!.id}
                seasonId={props.seasonId}
                contestId={props.contestId}
                participants={participants()}
                onParticipantsChanged={loadParticipants}
              />
            </div>
          )}
        </>
      )}

      <EntityFormModal
        isOpen={showCreateModal()}
        title="Create Division"
        entity={null}
        onSave={handleCreate}
        onCancel={() => setShowCreateModal(false)}
        fields={divisionFields}
      />

      <EntityFormModal
        isOpen={editingDivision() !== null}
        title="Edit Division"
        entity={editingDivision()}
        onSave={handleUpdate}
        onCancel={() => setEditingDivision(null)}
        fields={divisionFields}
      />

      <DeleteConfirmationModal
        isOpen={deletingDivision() !== null}
        entityName={deletingDivision()?.name || ""}
        entityType="division"
        onConfirm={handleDelete}
        onCancel={() => setDeletingDivision(null)}
      />
    </div>
  );
};

export default Divisions;
```

**Step 2: Run typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Run all tests**

Run: `bun run test:all`
Expected: All tests pass

**Step 4: Format and lint**

Run: `bun format && bun check:fix`
Expected: Clean

**Step 5: Commit**

```bash
git add src/app/pages/Divisions.tsx
git commit -m "(refactor) use BracketSection in Divisions page"
```

---

### Task 6: Final verification

**Step 1: Run full quality checks**

Run: `bun run test:all && bun format && bun check:fix && bun typecheck`
Expected: All pass with zero errors

**Step 2: Verify file sizes**

Run: `wc -l src/app/pages/HeatScoreSheet.tsx src/app/pages/Divisions.tsx src/app/components/ScoreColumn.tsx src/app/components/RiderScoreCard.tsx src/app/components/BracketSection.tsx`
Expected: HeatScoreSheet ~350 lines, Divisions ~210 lines, ScoreColumn ~130 lines, RiderScoreCard ~60 lines, BracketSection ~320 lines
