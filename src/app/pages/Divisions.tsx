import { useNavigate, useParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import HeatCreationForm from "../components/HeatCreationForm";
import { useAuth } from "../contexts/AuthContext";
import type { Bracket, Division, Heat, Rider } from "../types";
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
  
  // Bracket-related state
  const [brackets, setBrackets] = createSignal<Bracket[]>([]);
  const [selectedBracket, setSelectedBracket] = createSignal<Bracket | null>(null);
  const [heats, setHeats] = createSignal<Heat[]>([]);
  const [participants, setParticipants] = createSignal<Rider[]>([]);
  const [showCreateBracketModal, setShowCreateBracketModal] = createSignal(false);
  const [editingBracket, setEditingBracket] = createSignal<Bracket | null>(null);
  const [deletingBracket, setDeletingBracket] = createSignal<Bracket | null>(null);
  const [showHeatForm, setShowHeatForm] = createSignal(false);
  const [editingHeat, setEditingHeat] = createSignal<Heat | null>(null);
  const [deletingHeat, setDeletingHeat] = createSignal<Heat | null>(null);
  
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

  const loadBrackets = async () => {
    const division = selectedDivision();
    if (!division) return;
    try {
      const data = await apiGet<{ brackets: Bracket[] }>(
        `/api/brackets?divisionId=${division.id}`
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

  const loadParticipants = async () => {
    const division = selectedDivision();
    if (!division) return;
    try {
      const data = await apiGet<{ riders: Rider[] }>(
        `/api/divisions/${division.id}/participants`
      );
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
      setSelectedBracket(null);
      setHeats([]);
      loadBrackets();
      loadParticipants();
    }
  });

  createEffect(() => {
    if (selectedBracket()) {
      loadHeats();
    }
  });

  const handleCreate = async (formData: any) => {
    try {
      await apiPost("/api/divisions", { ...formData, contestId: props.contestId });
      setShowCreateModal(false);
      loadDivisions();
    } catch (error) {
      console.error("Error creating division:", error);
      alert(error instanceof Error ? error.message : "Failed to create division");
    }
  };

  const handleUpdate = async (formData: any) => {
    if (!editingDivision()) return;
    try {
      await apiPut(`/api/divisions/${editingDivision()!.id}`, formData);
      setEditingDivision(null);
      loadDivisions();
    } catch (error) {
      console.error("Error updating division:", error);
      alert(error instanceof Error ? error.message : "Failed to update division");
    }
  };

  const handleDelete = async () => {
    if (!deletingDivision()) return;
    try {
      await apiDelete(`/api/divisions/${deletingDivision()!.id}`);
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

  // Helper to get rider details from heat riderIds
  const getHeatRiders = (heat: Heat): Rider[] => {
    return heat.riderIds
      .map((id) => participants().find((r) => r.id === id))
      .filter((r): r is Rider => r !== undefined);
  };

  const handleCreateBracket = async (formData: any) => {
    const division = selectedDivision();
    if (!division) return;
    try {
      await apiPost("/api/brackets", { ...formData, divisionId: division.id });
      setShowCreateBracketModal(false);
      loadBrackets();
    } catch (error) {
      console.error("Error creating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to create bracket");
    }
  };

  const handleUpdateBracket = async (formData: any) => {
    if (!editingBracket()) return;
    try {
      await apiPut(`/api/brackets/${editingBracket()!.id}`, formData);
      setEditingBracket(null);
      loadBrackets();
    } catch (error) {
      console.error("Error updating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to update bracket");
    }
  };

  const handleDeleteBracket = async () => {
    if (!deletingBracket()) return;
    try {
      await apiDelete(`/api/brackets/${deletingBracket()!.id}`);
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
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Divisions</h1>
        {auth.isHeadJudgeOrAdmin() && (
          <button
            onClick={() => setShowCreateModal(true)}
            class="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
          >
            Create Division
          </button>
        )}
      </div>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <>
          <div class="border-b border-gray-200 overflow-x-auto">
            <nav class="-mb-px flex space-x-4 sm:space-x-8">
              {divisions().map((division) => (
                <button
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
                <h2 class="text-lg sm:text-xl font-semibold">{selectedDivision()!.name}</h2>
                <div class="flex flex-wrap gap-2">
                  {auth.isHeadJudgeOrAdmin() && (
                    <>
                      <button
                        onClick={() =>
                          navigate(
                            `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${selectedDivision()!.id}/participants`
                          )
                        }
                        class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Participants
                      </button>
                      <button
                        onClick={() => setEditingDivision(selectedDivision()!)}
                        class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingDivision(selectedDivision()!)}
                        class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Brackets Section */}
              <div class="mt-6">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 class="text-base sm:text-lg font-semibold">Brackets</h3>
                  {auth.isHeadJudgeOrAdmin() && (
                    <button
                      onClick={() => setShowCreateBracketModal(true)}
                      class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
                    >
                      Create Bracket
                    </button>
                  )}
                </div>

                {brackets().length === 0 ? (
                  <p class="text-xs sm:text-sm text-gray-500">No brackets in this division yet.</p>
                ) : (
                  <>
                    <div class="mb-4">
                      <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Select Bracket:
                      </label>
                      <select
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
                          <h4 class="text-base sm:text-lg font-semibold">
                            {selectedBracket()!.name}
                          </h4>
                          {auth.isHeadJudgeOrAdmin() && (
                            <div class="flex flex-wrap gap-2">
                              <button
                                onClick={() => setShowHeatForm(true)}
                                class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                              >
                                Create Heat
                              </button>
                              <button
                                onClick={() => setEditingBracket(selectedBracket()!)}
                                class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingBracket(selectedBracket()!)}
                                class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Heats */}
                        <div class="mt-4">
                          <h5 class="text-sm sm:text-base font-medium mb-3">Heats</h5>
                          {heats().length === 0 ? (
                            <p class="text-xs sm:text-sm text-gray-500">No heats in this bracket yet.</p>
                          ) : (
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              {heats().map((heat) => (
                                <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                                  <div
                                    class="cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => {
                                      navigate(
                                        `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${selectedDivision()!.id}/brackets/${selectedBracket()!.id}/heats/${heat.heatId}`
                                      );
                                    }}
                                  >
                                    <h6 class="text-sm sm:text-base font-semibold">Heat: {heat.heatId}</h6>
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
                                      {heat.heatRules.jumpsCounting} jumps | Scores: {heat.scores.length}
                                    </p>
                                  </div>
                                  {auth.isHeadJudgeOrAdmin() && (
                                    <div class="mt-2 sm:mt-3 flex space-x-2">
                                      <button
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
              </div>
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

      {/* Bracket Modals */}
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
          bracketId={selectedBracket()!.id}
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

      {/* Heat Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deletingHeat() !== null}
        entityName={deletingHeat()?.heatId || ""}
        entityType="heat"
        onConfirm={async () => {
          if (deletingHeat()) {
            try {
              await apiDelete(`/api/heats/${deletingHeat()!.heatId}`);
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

export default Divisions;
