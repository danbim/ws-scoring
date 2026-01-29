import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import Button from "../components/ui/Button";
import Heading from "../components/ui/Heading";
import PageHeader from "../components/ui/PageHeader";
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

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await apiPost("/api/seasons", formData);
      setShowCreateModal(false);
      loadSeasons();
    } catch (error) {
      console.error("Error creating season:", error);
      alert(error instanceof Error ? error.message : "Failed to create season");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const season = editingSeason();
    if (!season) return;
    try {
      await apiPut(`/api/seasons/${season.id}`, formData);
      setEditingSeason(null);
      loadSeasons();
    } catch (error) {
      console.error("Error updating season:", error);
      alert(error instanceof Error ? error.message : "Failed to update season");
    }
  };

  const handleDelete = async () => {
    const season = deletingSeason();
    if (!season) return;
    try {
      await apiDelete(`/api/seasons/${season.id}`);
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
      <PageHeader
        action={
          auth.isHeadJudgeOrAdmin() && (
            <Button
              variant="primary"
              fullWidth="responsive"
              onClick={() => setShowCreateModal(true)}
            >
              Create Season
            </Button>
          )
        }
      >
        Seasons
      </PageHeader>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {seasons().map((season) => (
            <button
              type="button"
              class="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow text-left w-full"
              onClick={() => navigate(`/seasons/${season.id}/contests`)}
            >
              <Heading level={3} class="mb-2">
                {season.name}
              </Heading>
              <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-4">Year: {season.year}</p>
              <p class="text-xs sm:text-sm text-gray-600">
                {season.startDate} - {season.endDate}
              </p>
              {auth.isHeadJudgeOrAdmin() && (
                <div class="mt-3 sm:mt-4 flex space-x-2">
                  <Button
                    variant="text"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSeason(season);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger-text"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingSeason(season);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </button>
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
