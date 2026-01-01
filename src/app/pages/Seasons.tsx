import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, onMount, Show } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import { useAuth } from "../contexts/AuthContext";
import type { Season } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";

const Seasons: Component = () => {
  const [seasons, setSeasons] = createSignal<Season[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingSeason, setEditingSeason] = createSignal<Season | null>(null);
  const [deletingSeason, setDeletingSeason] = createSignal<Season | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const loadSeasons = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ seasons: Season[] }>("/api/seasons");
      setSeasons(data.seasons);
    } catch (error) {
      console.error("Error loading seasons:", error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadSeasons();
  });

  const handleCreate = async (formData: any) => {
    try {
      await apiPost("/api/seasons", formData);
      setShowCreateModal(false);
      loadSeasons();
    } catch (error) {
      console.error("Error creating season:", error);
      alert(error instanceof Error ? error.message : "Failed to create season");
    }
  };

  const handleUpdate = async (formData: any) => {
    if (!editingSeason()) return;
    try {
      await apiPut(`/api/seasons/${editingSeason()!.id}`, formData);
      setEditingSeason(null);
      loadSeasons();
    } catch (error) {
      console.error("Error updating season:", error);
      alert(error instanceof Error ? error.message : "Failed to update season");
    }
  };

  const handleDelete = async () => {
    if (!deletingSeason()) return;
    try {
      await apiDelete(`/api/seasons/${deletingSeason()!.id}`);
      setDeletingSeason(null);
      loadSeasons();
    } catch (error) {
      console.error("Error deleting season:", error);
      alert(error instanceof Error ? error.message : "Failed to delete season");
    }
  };

  const seasonFields = [
    { name: "name", label: "Name", type: "text" as const, required: true },
    { name: "year", label: "Year", type: "number" as const, required: true },
    { name: "startDate", label: "Start Date", type: "date" as const, required: true },
    { name: "endDate", label: "End Date", type: "date" as const, required: true },
  ];

  return (
    <div>
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Seasons</h1>
        {auth.isHeadJudgeOrAdmin() && (
          <button
            onClick={() => setShowCreateModal(true)}
            class="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
          >
            Create Season
          </button>
        )}
      </div>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {seasons().map((season) => (
            <div
              class="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/seasons/${season.id}/contests`)}
            >
              <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">{season.name}</h3>
              <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">Year: {season.year}</p>
              <p class="text-xs sm:text-sm text-gray-600">
                {season.startDate} - {season.endDate}
              </p>
              {auth.isHeadJudgeOrAdmin() && (
                <div class="mt-3 sm:mt-4 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSeason(season);
                    }}
                    class="text-xs sm:text-sm px-2 py-1 text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingSeason(season);
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

      <EntityFormModal
        isOpen={showCreateModal()}
        title="Create Season"
        entity={null}
        onSave={handleCreate}
        onCancel={() => setShowCreateModal(false)}
        fields={seasonFields}
      />

      <EntityFormModal
        isOpen={editingSeason() !== null}
        title="Edit Season"
        entity={editingSeason()}
        onSave={handleUpdate}
        onCancel={() => setEditingSeason(null)}
        fields={seasonFields}
      />

      <DeleteConfirmationModal
        isOpen={deletingSeason() !== null}
        entityName={deletingSeason()?.name || ""}
        entityType="season"
        onConfirm={handleDelete}
        onCancel={() => setDeletingSeason(null)}
      />
    </div>
  );
};

export default Seasons;
