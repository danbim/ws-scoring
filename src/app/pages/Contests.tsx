import { useNavigate } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import Button from "../components/ui/Button";
import Heading from "../components/ui/Heading";
import { useAuth } from "../contexts/AuthContext";
import type { Contest } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";

interface ContestsProps {
  seasonId: string;
}

const Contests: Component<ContestsProps> = (props) => {
  const [contests, setContests] = createSignal<Contest[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingContest, setEditingContest] = createSignal<Contest | null>(null);
  const [deletingContest, setDeletingContest] = createSignal<Contest | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const loadContests = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ contests: Contest[] }>(
        `/api/contests?seasonId=${props.seasonId}`
      );
      setContests(data.contests);
    } catch (error) {
      console.error("Error loading contests:", error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadContests();
  });

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await apiPost("/api/contests", { ...formData, seasonId: props.seasonId });
      setShowCreateModal(false);
      loadContests();
    } catch (error) {
      console.error("Error creating contest:", error);
      alert(error instanceof Error ? error.message : "Failed to create contest");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const contest = editingContest();
    if (!contest) return;
    try {
      await apiPut(`/api/contests/${contest.id}`, formData);
      setEditingContest(null);
      loadContests();
    } catch (error) {
      console.error("Error updating contest:", error);
      alert(error instanceof Error ? error.message : "Failed to update contest");
    }
  };

  const handleDelete = async () => {
    const contest = deletingContest();
    if (!contest) return;
    try {
      await apiDelete(`/api/contests/${contest.id}`);
      setDeletingContest(null);
      loadContests();
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
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <Heading level={1}>Contests</Heading>
        {auth.isHeadJudgeOrAdmin() && (
          <Button variant="primary" fullWidth="responsive" onClick={() => setShowCreateModal(true)}>
            Create Contest
          </Button>
        )}
      </div>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {contests().map((contest) => (
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
                    variant="text"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingContest(contest);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger-text"
                    size="sm"
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
          ))}
        </div>
      )}

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
