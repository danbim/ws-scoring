import { useNavigate, useParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createSignal, For, onMount } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import type { Rider } from "../types";
import { apiDelete, apiGet, apiPost } from "../utils/api";

interface DivisionParticipantsProps {
  divisionId: string;
}

const DivisionParticipants: Component<DivisionParticipantsProps> = (props) => {
  const [allRiders, setAllRiders] = createSignal<Rider[]>([]);
  const [participants, setParticipants] = createSignal<Rider[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchTerm, setSearchTerm] = createSignal("");
  const auth = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [allRidersData, participantsData] = await Promise.all([
        apiGet<{ riders: Rider[] }>("/api/riders"),
        apiGet<{ riders: Rider[] }>(`/api/divisions/${props.divisionId}/participants`),
      ]);
      setAllRiders(allRidersData.riders);
      setParticipants(participantsData.riders);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadData();
  });

  const handleAddParticipant = async (riderId: string) => {
    try {
      await apiPost(`/api/divisions/${props.divisionId}/participants`, { riderId });
      loadData();
    } catch (error) {
      console.error("Error adding participant:", error);
      alert(error instanceof Error ? error.message : "Failed to add participant");
    }
  };

  const handleRemoveParticipant = async (riderId: string) => {
    try {
      await apiDelete(`/api/divisions/${props.divisionId}/participants/${riderId}`);
      loadData();
    } catch (error) {
      console.error("Error removing participant:", error);
      alert(error instanceof Error ? error.message : "Failed to remove participant");
    }
  };

  const participantIds = () => new Set(participants().map((p) => p.id));

  const filteredRiders = () => {
    const term = searchTerm().toLowerCase();
    return allRiders().filter(
      (rider) =>
        !rider.deletedAt &&
        (rider.firstName.toLowerCase().includes(term) ||
          rider.lastName.toLowerCase().includes(term) ||
          rider.country.toLowerCase().includes(term) ||
          (rider.sailNumber && rider.sailNumber.toLowerCase().includes(term)))
    );
  };

  return (
    <div>
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Division Participants</h1>
        <button
          onClick={() => navigate(-1)}
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
      </div>

      {loading() ? (
        <div class="text-center py-8">Loading...</div>
      ) : (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 class="text-lg font-semibold mb-4">Available Riders</h2>
            <input
              type="text"
              placeholder="Search riders..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              class="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div class="bg-white shadow rounded-md max-h-96 overflow-y-auto">
              <ul class="divide-y divide-gray-200">
                <For each={filteredRiders()}>
                  {(rider) => {
                    const isParticipant = participantIds().has(rider.id);
                    return (
                      <li class="p-4">
                        <div class="flex justify-between items-center">
                          <div>
                            <h3 class="text-sm font-medium text-gray-900">
                              {rider.firstName} {rider.lastName}
                            </h3>
                            <p class="text-sm text-gray-600">
                              {rider.country} {rider.sailNumber && `| ${rider.sailNumber}`}
                            </p>
                          </div>
                          {auth.isHeadJudgeOrAdmin() && (
                            <button
                              onClick={() =>
                                isParticipant
                                  ? handleRemoveParticipant(rider.id)
                                  : handleAddParticipant(rider.id)
                              }
                              class={`px-3 py-1 text-sm rounded-md ${
                                isParticipant
                                  ? "bg-red-100 text-red-800 hover:bg-red-200"
                                  : "bg-green-100 text-green-800 hover:bg-green-200"
                              }`}
                            >
                              {isParticipant ? "Remove" : "Add"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </div>
          </div>

          <div>
            <h2 class="text-lg font-semibold mb-4">Current Participants</h2>
            <div class="bg-white shadow rounded-md max-h-96 overflow-y-auto">
              {participants().length === 0 ? (
                <p class="p-4 text-gray-500 text-center">No participants yet</p>
              ) : (
                <ul class="divide-y divide-gray-200">
                  <For each={participants()}>
                    {(rider) => (
                      <li class="p-4">
                        <div class="flex justify-between items-center">
                          <div>
                            <h3 class="text-sm font-medium text-gray-900">
                              {rider.firstName} {rider.lastName}
                            </h3>
                            <p class="text-sm text-gray-600">
                              {rider.country} {rider.sailNumber && `| ${rider.sailNumber}`}
                            </p>
                          </div>
                        </div>
                      </li>
                    )}
                  </For>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DivisionParticipants;
