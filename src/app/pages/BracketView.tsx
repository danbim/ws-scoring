import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import HeatCreationForm from "../components/HeatCreationForm";
import { useAuth } from "../contexts/AuthContext";
import type { Bracket, Division, Heat, Rider } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";

interface BracketViewProps {
  seasonId?: string;
  contestId?: string;
  divisionId?: string;
  bracketId?: string;
}

const BracketView: Component<BracketViewProps> = (props) => {
  const [brackets, setBrackets] = createSignal<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = createSignal<Bracket | null>(null);
  const [heats, setHeats] = createSignal<Heat[]>([]);
  const [division, setDivision] = createSignal<Division | null>(null);
  const [participants, setParticipants] = createSignal<Rider[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [mounted, setMounted] = createSignal(false);
  const [showCreateBracketModal, setShowCreateBracketModal] = createSignal(false);
  const [editingBracket, setEditingBracket] = createSignal<Bracket | null>(null);
  const [deletingBracket, setDeletingBracket] = createSignal<Bracket | null>(null);
  const [showHeatForm, setShowHeatForm] = createSignal(false);
  const [editingHeat, setEditingHeat] = createSignal<Heat | null>(null);
  const [deletingHeat, setDeletingHeat] = createSignal<Heat | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const loadBrackets = async () => {
    if (!props.divisionId) return;
    try {
      const data = await apiGet<{ brackets: Bracket[] }>(
        `/api/brackets?divisionId=${props.divisionId}`
      );
      setBrackets(data.brackets);
      if (data.brackets.length > 0) {
        setSelectedBracket(data.brackets[0]);
      }
    } catch (error) {
      console.error("Error loading brackets:", error);
    }
  };

  const loadDivision = async () => {
    if (!props.divisionId) return;
    try {
      const data = await apiGet<Division>(`/api/divisions/${props.divisionId}`);
      setDivision(data);
    } catch (error) {
      console.error("Error loading division:", error);
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

  const loadParticipants = async () => {
    if (!props.divisionId) return;
    try {
      const data = await apiGet<{ riders: Rider[] }>(
        `/api/divisions/${props.divisionId}/participants`
      );
      setParticipants(data.riders);
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  onMount(async () => {
    setLoading(true);
    if (props.divisionId) {
      await Promise.all([loadDivision(), loadBrackets(), loadParticipants()]);
      // If bracketId is provided, select that bracket
      if (props.bracketId) {
        try {
          const bracketData = await apiGet<Bracket>(`/api/brackets/${props.bracketId}`);
          setSelectedBracket(bracketData);
          await loadHeats();
        } catch (error) {
          console.error("Error loading bracket:", error);
        }
      } else if (brackets().length > 0) {
        // Otherwise select first bracket (but don't navigate - let user choose)
        setSelectedBracket(brackets()[0]);
      }
    }
    setLoading(false);
    setMounted(true);
  });

  createEffect(() => {
    if (selectedBracket()) {
      loadHeats();
    }
  });

  // React to route changes (e.g., browser back/forward)
  createEffect(async () => {
    // Only run after initial mount and when brackets are loaded
    if (!mounted() || !props.divisionId || brackets().length === 0) return;

    const currentBracketId = selectedBracket()?.id;

    if (props.bracketId) {
      // If bracketId is in the route, load that bracket (only if different from current)
      if (currentBracketId !== props.bracketId) {
        try {
          const bracketData = await apiGet<Bracket>(`/api/brackets/${props.bracketId}`);
          setSelectedBracket(bracketData);
          await loadHeats();
        } catch (error) {
          console.error("Error loading bracket:", error);
          // If bracket not found, select first bracket
          if (brackets().length > 0) {
            setSelectedBracket(brackets()[0]);
          }
        }
      }
    } else {
      // If no bracketId in route (user navigated back), select first bracket without navigating
      if (brackets().length > 0) {
        const firstBracket = brackets()[0];
        if (currentBracketId !== firstBracket.id) {
          setSelectedBracket(firstBracket);
        }
      }
    }
  });

  const handleCreateBracket = async (formData: Record<string, unknown>) => {
    if (!props.divisionId) return;
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
    <div>
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
          {division() ? `${division()?.name} - Brackets` : "Brackets"}
        </h1>
        {auth.isHeadJudgeOrAdmin() && props.divisionId && (
          <button
            type="button"
            onClick={() => setShowCreateBracketModal(true)}
            class="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
          >
            Create Bracket
          </button>
        )}
      </div>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <>
          {brackets().length > 0 && (
            <div class="mb-4">
              <label for="bracket-select" class="block text-sm font-medium text-gray-700 mb-2">
                Select Bracket:
              </label>
              <select
                id="bracket-select"
                value={selectedBracket()?.id || ""}
                onChange={(e) => {
                  const bracket = brackets().find((b) => b.id === e.currentTarget.value);
                  if (bracket && props.seasonId && props.contestId && props.divisionId) {
                    navigate(
                      `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${props.divisionId}/brackets/${bracket.id}/heats`
                    );
                  }
                }}
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {brackets().map((bracket) => (
                  <option value={bracket.id}>{bracket.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedBracket() && (
            <div class="bg-white rounded-lg shadow p-4 sm:p-6">
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 class="text-lg sm:text-xl font-semibold">{selectedBracket()?.name}</h2>
                {auth.isHeadJudgeOrAdmin() && (
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowHeatForm(true)}
                      class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Create Heat
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const bracket = selectedBracket();
                        if (bracket) setEditingBracket(bracket);
                      }}
                      class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const bracket = selectedBracket();
                        if (bracket) setDeletingBracket(bracket);
                      }}
                      class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div class="mt-6">
                <h3 class="text-lg font-medium mb-4">Heats</h3>
                {heats().length === 0 ? (
                  <p class="text-gray-500">No heats in this bracket yet.</p>
                ) : (
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {heats().map((heat) => (
                      <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <button
                          type="button"
                          class="cursor-pointer hover:bg-gray-100 transition-colors text-left w-full"
                          onClick={() => {
                            const bracket = selectedBracket();
                            if (props.seasonId && props.contestId && props.divisionId && bracket) {
                              navigate(
                                `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${props.divisionId}/brackets/${bracket.id}/heats/${heat.heatId}`
                              );
                            }
                          }}
                          aria-label={`View heat ${heat.heatId}`}
                        >
                          <h4 class="text-sm sm:text-base font-semibold">Heat: {heat.heatId}</h4>
                          <p class="text-xs sm:text-sm text-gray-600">
                            Riders: {heat.riderIds.length} | Scores: {heat.scores.length}
                          </p>
                          <p class="text-xs sm:text-sm text-gray-500 mt-1">
                            Rules: {heat.heatRules.wavesCounting} waves,{" "}
                            {heat.heatRules.jumpsCounting} jumps
                          </p>
                        </button>
                        {auth.isHeadJudgeOrAdmin() && (
                          <div class="mt-2 sm:mt-3 flex space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingHeat(heat);
                                setShowHeatForm(true);
                              }}
                              class="text-xs sm:text-sm px-2 py-1 text-indigo-600 hover:text-indigo-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingHeat(heat);
                              }}
                              class="text-xs sm:text-sm px-2 py-1 text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

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

      <Show when={showHeatForm() && selectedBracket()}>
        <HeatCreationForm
          bracketId={selectedBracket()?.id || ""}
          participants={participants()}
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

      <DeleteConfirmationModal
        isOpen={deletingHeat() !== null}
        entityName={deletingHeat()?.heatId || ""}
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

export default BracketView;
