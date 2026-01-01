import { useNavigate, useParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import { useAuth } from "../contexts/AuthContext";
import type { Division } from "../types";
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

  onMount(() => {
    loadDivisions();
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
                  <button
                    onClick={() =>
                      navigate(
                        `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${selectedDivision()!.id}/brackets`
                      )
                    }
                    class="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Brackets
                  </button>
                </div>
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
    </div>
  );
};

export default Divisions;
