import type { Component } from "solid-js";
import { createSignal, onMount } from "solid-js";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import EntityFormModal from "../components/EntityFormModal";
import { useAuth } from "../contexts/AuthContext";
import type { Rider } from "../types";
import { apiDelete, apiGet, apiPost, apiPut } from "../utils/api";

const Riders: Component = () => {
  const [riders, setRiders] = createSignal<Rider[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showDeleted, setShowDeleted] = createSignal(false);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [editingRider, setEditingRider] = createSignal<Rider | null>(null);
  const [deletingRider, setDeletingRider] = createSignal<Rider | null>(null);
  const [searchTerm, setSearchTerm] = createSignal("");
  const auth = useAuth();

  const loadRiders = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ riders: Rider[] }>(`/api/riders?includeDeleted=${showDeleted()}`);
      setRiders(data.riders);
    } catch (error) {
      console.error("Error loading riders:", error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadRiders();
  });

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      await apiPost("/api/riders", formData);
      setShowCreateModal(false);
      loadRiders();
    } catch (error) {
      console.error("Error creating rider:", error);
      alert(error instanceof Error ? error.message : "Failed to create rider");
    }
  };

  const handleUpdate = async (formData: Record<string, unknown>) => {
    const rider = editingRider();
    if (!rider) return;
    try {
      await apiPut(`/api/riders/${rider.id}`, formData);
      setEditingRider(null);
      loadRiders();
    } catch (error) {
      console.error("Error updating rider:", error);
      alert(error instanceof Error ? error.message : "Failed to update rider");
    }
  };

  const handleDelete = async () => {
    const rider = deletingRider();
    if (!rider) return;
    try {
      await apiDelete(`/api/riders/${rider.id}`);
      setDeletingRider(null);
      loadRiders();
    } catch (error) {
      console.error("Error deleting rider:", error);
      alert(error instanceof Error ? error.message : "Failed to delete rider");
    }
  };

  const riderFields = [
    { name: "firstName", label: "First Name", type: "text" as const, required: true },
    { name: "lastName", label: "Last Name", type: "text" as const, required: true },
    { name: "country", label: "Country", type: "text" as const, required: true },
    { name: "sailNumber", label: "Sail Number", type: "text" as const, required: false },
    { name: "email", label: "Email", type: "text" as const, required: false },
    { name: "dateOfBirth", label: "Date of Birth", type: "date" as const, required: false },
  ];

  const filteredRiders = () => {
    const term = searchTerm().toLowerCase();
    return riders().filter(
      (rider) =>
        rider.firstName.toLowerCase().includes(term) ||
        rider.lastName.toLowerCase().includes(term) ||
        rider.country.toLowerCase().includes(term) ||
        rider.sailNumber?.toLowerCase().includes(term)
    );
  };

  return (
    <div>
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Riders</h1>
        {auth.isHeadJudgeOrAdmin() && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            class="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
          >
            Create Rider
          </button>
        )}
      </div>

      <div class="mb-4 flex flex-col sm:flex-row gap-3 sm:space-x-4">
        <input
          type="text"
          placeholder="Search riders..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showDeleted()}
            onChange={(e) => {
              setShowDeleted(e.currentTarget.checked);
              loadRiders();
            }}
            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span class="text-xs sm:text-sm text-gray-700">Show deleted</span>
        </label>
      </div>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <div class="bg-white shadow overflow-hidden sm:rounded-md">
          <ul class="divide-y divide-gray-200">
            {filteredRiders().map((rider) => (
              <li class={`p-3 sm:p-4 ${rider.deletedAt ? "opacity-50" : ""}`}>
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h3 class="text-base sm:text-lg font-medium text-gray-900">
                      {rider.firstName} {rider.lastName}
                    </h3>
                    <p class="text-xs sm:text-sm text-gray-600">
                      {rider.country} {rider.sailNumber && `| Sail: ${rider.sailNumber}`}
                    </p>
                    {rider.email && <p class="text-xs sm:text-sm text-gray-600">{rider.email}</p>}
                    {rider.deletedAt && (
                      <p class="text-xs sm:text-sm text-red-600">Deleted: {rider.deletedAt}</p>
                    )}
                  </div>
                  {auth.isHeadJudgeOrAdmin() && (
                    <div class="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingRider(rider)}
                        class="text-xs sm:text-sm px-2 py-1 text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                      {!rider.deletedAt && (
                        <button
                          type="button"
                          onClick={() => setDeletingRider(rider)}
                          class="text-xs sm:text-sm px-2 py-1 text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <EntityFormModal
        isOpen={showCreateModal()}
        title="Create Rider"
        entity={null}
        onSave={handleCreate}
        onCancel={() => setShowCreateModal(false)}
        fields={riderFields}
      />

      <EntityFormModal
        isOpen={editingRider() !== null}
        title="Edit Rider"
        entity={editingRider()}
        onSave={handleUpdate}
        onCancel={() => setEditingRider(null)}
        fields={riderFields}
      />

      <DeleteConfirmationModal
        isOpen={deletingRider() !== null}
        entityName={`${deletingRider()?.firstName} ${deletingRider()?.lastName}`}
        entityType="rider"
        onConfirm={handleDelete}
        onCancel={() => setDeletingRider(null)}
      />
    </div>
  );
};

export default Riders;
