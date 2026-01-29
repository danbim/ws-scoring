import { useNavigate } from "@solidjs/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import BracketSection from "../components/BracketSection";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import Button from "../components/ui/Button";
import Heading from "../components/ui/Heading";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import type { Division } from "../types";
import { orpc } from "../utils/orpc";

interface DivisionsProps {
  seasonId: string;
  contestId: string;
}

const Divisions: Component<DivisionsProps> = (props) => {
  const [selectedTab, setSelectedTab] = createSignal<string | null>(null);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingDivision, setEditingDivision] = createSignal<Division | null>(null);
  const [deletingDivision, setDeletingDivision] = createSignal<Division | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const divisionsQuery = useQuery(() => ({
    ...orpc.division.list.queryOptions({ input: { contestId: props.contestId } }),
    select: (data) => data.divisions,
  }));

  const participantsQuery = useQuery(() => ({
    ...orpc.participant.list.queryOptions({ input: { divisionId: selectedTab() ?? "" } }),
    enabled: !!selectedTab(),
    select: (data) => data.riders,
  }));

  createEffect(() => {
    const divs = divisionsQuery.data;
    if (divs && divs.length > 0 && !selectedTab()) {
      setSelectedTab(divs[0].id);
    }
  });

  const createMut = useMutation(() =>
    orpc.division.create.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.division.key() });
      },
    })
  );

  const updateMut = useMutation(() =>
    orpc.division.update.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.division.key() });
      },
    })
  );

  const deleteMut = useMutation(() =>
    orpc.division.delete.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.division.key() });
      },
    })
  );

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await createMut.mutateAsync({
        contestId: props.contestId,
        ...(formData as {
          name: string;
          category:
            | "pro_men"
            | "pro_women"
            | "amateur_men"
            | "amateur_women"
            | "pro_youth"
            | "amateur_youth"
            | "pro_masters"
            | "amateur_masters";
        }),
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating division:", error);
      alert(error instanceof Error ? error.message : "Failed to create division");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const division = editingDivision();
    if (!division) return;
    try {
      await updateMut.mutateAsync({
        divisionId: division.id,
        data: formData as {
          name?: string;
          contestId?: string;
          category?:
            | "pro_men"
            | "pro_women"
            | "amateur_men"
            | "amateur_women"
            | "pro_youth"
            | "amateur_youth"
            | "pro_masters"
            | "amateur_masters";
        },
      });
      setEditingDivision(null);
    } catch (error) {
      console.error("Error updating division:", error);
      alert(error instanceof Error ? error.message : "Failed to update division");
    }
  };

  const handleDelete = async () => {
    const division = deletingDivision();
    if (!division) return;
    try {
      await deleteMut.mutateAsync({ divisionId: division.id });
      setDeletingDivision(null);
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

  const selectedDivision = () => divisionsQuery.data?.find((d) => d.id === selectedTab());

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

      <Switch>
        <Match when={divisionsQuery.isPending}>
          <div class="text-center py-8">Loading...</div>
        </Match>
        <Match when={divisionsQuery.data}>
          {(divisions) => (
            <>
              <div class="border-b border-gray-200 overflow-x-auto">
                <nav class="-mb-px flex space-x-4 sm:space-x-8">
                  <For each={divisions()}>
                    {(division) => (
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
                    )}
                  </For>
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

                  <Show
                    when={participantsQuery.data}
                    fallback={
                      <div class="text-center py-4 text-sm text-gray-500">
                        Loading participants...
                      </div>
                    }
                  >
                    {(participants) => (
                      <BracketSection
                        divisionId={selectedDivision()?.id ?? ""}
                        seasonId={props.seasonId}
                        contestId={props.contestId}
                        participants={participants()}
                        onParticipantsChanged={() => {
                          queryClient.invalidateQueries({ queryKey: orpc.participant.key() });
                        }}
                      />
                    )}
                  </Show>
                </div>
              )}
            </>
          )}
        </Match>
      </Switch>

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
