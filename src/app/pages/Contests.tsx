import { useNavigate } from "@solidjs/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { createSignal, For, Match, Switch } from "solid-js";
import { Button } from "@/components/ui/button";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import Heading from "../components/ui/Heading";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import type { Contest } from "../types";
import { orpc } from "../utils/orpc";

interface ContestsProps {
  seasonId: string;
}

const Contests: Component<ContestsProps> = (props) => {
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingContest, setEditingContest] = createSignal<Contest | null>(null);
  const [deletingContest, setDeletingContest] = createSignal<Contest | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const contestsQuery = useQuery(() => ({
    ...orpc.contest.list.queryOptions({ input: { seasonId: props.seasonId } }),
    select: (data) => data.contests,
  }));

  const createMut = useMutation(() =>
    orpc.contest.create.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.contest.key() });
      },
    })
  );

  const updateMut = useMutation(() =>
    orpc.contest.update.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.contest.key() });
      },
    })
  );

  const deleteMut = useMutation(() =>
    orpc.contest.delete.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.contest.key() });
      },
    })
  );

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await createMut.mutateAsync({
        seasonId: props.seasonId,
        ...(formData as {
          name: string;
          location: string;
          startDate: string;
          endDate: string;
          status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
        }),
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating contest:", error);
      alert(error instanceof Error ? error.message : "Failed to create contest");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const contest = editingContest();
    if (!contest) return;
    try {
      await updateMut.mutateAsync({
        contestId: contest.id,
        data: formData as {
          seasonId?: string;
          name?: string;
          location?: string;
          startDate?: string;
          endDate?: string;
          status?: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
        },
      });
      setEditingContest(null);
    } catch (error) {
      console.error("Error updating contest:", error);
      alert(error instanceof Error ? error.message : "Failed to update contest");
    }
  };

  const handleDelete = async () => {
    const contest = deletingContest();
    if (!contest) return;
    try {
      await deleteMut.mutateAsync({ contestId: contest.id });
      setDeletingContest(null);
    } catch (error) {
      console.error("Error deleting contest:", error);
      alert(error instanceof Error ? error.message : "Failed to delete contest");
    }
  };

  const contestFields = [
    { name: "name", label: "Name", type: "text" as const, required: true },
    { name: "location", label: "Location", type: "text" as const, required: true },
    { name: "startDate", label: "Start Date", type: "date" as const, required: true },
    { name: "endDate", label: "End Date", type: "date" as const, required: true },
    {
      name: "status",
      label: "Status",
      type: "select" as const,
      required: true,
      options: [
        { value: "draft", label: "Draft" },
        { value: "scheduled", label: "Scheduled" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        action={
          auth.isHeadJudgeOrAdmin() && (
            <Button class="w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
              Create Contest
            </Button>
          )
        }
      >
        Contests
      </PageHeader>

      <Switch>
        <Match when={contestsQuery.isPending}>
          <div class="text-center py-8">Loading...</div>
        </Match>
        <Match when={contestsQuery.data}>
          {(contests) => (
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <For each={contests()}>
                {(contest) => (
                  <button
                    type="button"
                    class="bg-white rounded-lg shadow p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow text-left w-full"
                    onClick={() =>
                      navigate(`/seasons/${props.seasonId}/contests/${contest.id}/divisions`)
                    }
                  >
                    <Heading level={3} class="mb-2">
                      {contest.name}
                    </Heading>
                    <p class="text-xs sm:text-sm text-gray-600 mb-2">{contest.location}</p>
                    <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      {contest.startDate} - {contest.endDate}
                    </p>
                    <span class="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {contest.status}
                    </span>
                    {auth.isHeadJudgeOrAdmin() && (
                      <div class="mt-3 sm:mt-4 flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingContest(contest);
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
                            setDeletingContest(contest);
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
        title="Create Contest"
        entity={null}
        onSave={handleCreate}
        onCancel={() => setShowCreateModal(false)}
        fields={contestFields}
      />

      <EntityFormModal
        isOpen={editingContest() !== null}
        title="Edit Contest"
        entity={editingContest()}
        onSave={handleUpdate}
        onCancel={() => setEditingContest(null)}
        fields={contestFields}
      />

      <DeleteConfirmationModal
        isOpen={deletingContest() !== null}
        entityName={deletingContest()?.name || ""}
        entityType="contest"
        onConfirm={handleDelete}
        onCancel={() => setDeletingContest(null)}
      />
    </div>
  );
};

export default Contests;
