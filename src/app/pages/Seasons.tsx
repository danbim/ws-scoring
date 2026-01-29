import { useNavigate } from "@solidjs/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { createSignal, For, Match, Switch } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import { Button } from "@/components/ui/button";
import Heading from "../components/ui/Heading";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import type { Season } from "../types";
import { orpc } from "../utils/orpc";

const Seasons: Component = () => {
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingSeason, setEditingSeason] = createSignal<Season | null>(null);
  const [deletingSeason, setDeletingSeason] = createSignal<Season | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const seasonsQuery = useQuery(() => ({
    ...orpc.season.list.queryOptions({ input: {} }),
    select: (data) => data.seasons,
  }));

  const createMut = useMutation(() =>
    orpc.season.create.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.season.key() });
      },
    })
  );

  const updateMut = useMutation(() =>
    orpc.season.update.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.season.key() });
      },
    })
  );

  const deleteMut = useMutation(() =>
    orpc.season.delete.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.season.key() });
      },
    })
  );

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await createMut.mutateAsync(
        formData as { name: string; year: number; startDate: string; endDate: string }
      );
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating season:", error);
      alert(error instanceof Error ? error.message : "Failed to create season");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const season = editingSeason();
    if (!season) return;
    try {
      await updateMut.mutateAsync({
        seasonId: season.id,
        data: formData as { name?: string; year?: number; startDate?: string; endDate?: string },
      });
      setEditingSeason(null);
    } catch (error) {
      console.error("Error updating season:", error);
      alert(error instanceof Error ? error.message : "Failed to update season");
    }
  };

  const handleDelete = async () => {
    const season = deletingSeason();
    if (!season) return;
    try {
      await deleteMut.mutateAsync({ seasonId: season.id });
      setDeletingSeason(null);
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
              class="w-full sm:w-auto"
              onClick={() => setShowCreateModal(true)}
            >
              Create Season
            </Button>
          )
        }
      >
        Seasons
      </PageHeader>

      <Switch>
        <Match when={seasonsQuery.isPending}>
          <div class="text-center py-8">Loading...</div>
        </Match>
        <Match when={seasonsQuery.data}>
          {(seasons) => (
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <For each={seasons()}>
                {(season) => (
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
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSeason(season);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-destructive hover:text-destructive"
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
                )}
              </For>
            </div>
          )}
        </Match>
      </Switch>

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
