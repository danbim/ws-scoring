import { useNavigate } from "@solidjs/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { createSignal, For, Match, Switch } from "solid-js";
import { Button } from "@/components/ui/button";
import Heading from "../components/ui/Heading";
import PageHeader from "../components/ui/PageHeader";
import SearchInput from "../components/ui/SearchInput";
import { useAuth } from "../contexts/AuthContext";
import { orpc } from "../utils/orpc";

interface DivisionParticipantsProps {
  seasonId: string;
  contestId: string;
  divisionId: string;
}

const DivisionParticipants: Component<DivisionParticipantsProps> = (props) => {
  const [searchTerm, setSearchTerm] = createSignal("");
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const ridersQuery = useQuery(() => ({
    ...orpc.rider.list.queryOptions({ input: {} }),
    select: (data) => data.riders,
  }));
  const participantsQuery = useQuery(() => ({
    ...orpc.participant.list.queryOptions({ input: { divisionId: props.divisionId } }),
    select: (data) => data.riders,
  }));

  const addMut = useMutation(() =>
    orpc.participant.add.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.participant.key() });
        queryClient.invalidateQueries({ queryKey: orpc.rider.key() });
      },
    })
  );

  const removeMut = useMutation(() =>
    orpc.participant.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.participant.key() });
        queryClient.invalidateQueries({ queryKey: orpc.rider.key() });
      },
    })
  );

  const handleAddParticipant = async (riderId: string) => {
    try {
      await addMut.mutateAsync({ divisionId: props.divisionId, riderId });
    } catch (error) {
      console.error("Error adding participant:", error);
      alert(error instanceof Error ? error.message : "Failed to add participant");
    }
  };

  const handleRemoveParticipant = async (riderId: string) => {
    try {
      await removeMut.mutateAsync({ divisionId: props.divisionId, riderId });
    } catch (error) {
      console.error("Error removing participant:", error);
      alert(error instanceof Error ? error.message : "Failed to remove participant");
    }
  };

  const participantIds = () => {
    if (!participantsQuery.data) return new Set<string>();
    return new Set(participantsQuery.data.map((p) => p.id));
  };

  const filteredRiders = () => {
    if (!ridersQuery.data) return [];
    const term = searchTerm().toLowerCase();
    return ridersQuery.data.filter(
      (rider) =>
        !participantIds().has(rider.id) &&
        !rider.deletedAt &&
        (rider.firstName.toLowerCase().includes(term) ||
          rider.lastName.toLowerCase().includes(term) ||
          rider.country.toLowerCase().includes(term) ||
          rider.sailNumber?.toLowerCase().includes(term))
    );
  };

  return (
    <div>
      <PageHeader
        action={
          <Button
            variant="secondary"
            size="sm"
            class="w-full sm:w-auto"
            onClick={() =>
              navigate(`/seasons/${props.seasonId}/contests/${props.contestId}/divisions`)
            }
          >
            Back
          </Button>
        }
      >
        Division Participants
      </PageHeader>

      <Switch>
        <Match when={ridersQuery.isPending || participantsQuery.isPending}>
          <div class="text-center py-8">Loading...</div>
        </Match>
        <Match
          when={
            ridersQuery.data && participantsQuery.data
              ? { riders: ridersQuery.data, participants: participantsQuery.data }
              : undefined
          }
        >
          {(data) => (
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Heading level={2} class="mb-3 sm:mb-4">
                  Available Riders ({filteredRiders().length})
                </Heading>
                <SearchInput
                  placeholder="Search riders..."
                  value={searchTerm()}
                  onInput={setSearchTerm}
                  class="mb-3 sm:mb-4"
                />
                <div class="bg-white shadow rounded-md max-h-96 overflow-y-auto">
                  <ul class="divide-y divide-gray-200">
                    <For each={filteredRiders()}>
                      {(rider) => {
                        const isParticipant = participantIds().has(rider.id);
                        return (
                          <li class="p-3 sm:p-4">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <div>
                                <Heading level={3} class="text-xs sm:text-sm font-medium">
                                  {rider.firstName} {rider.lastName}
                                </Heading>
                                <p class="text-xs sm:text-sm text-gray-600">
                                  {rider.country} {rider.sailNumber && `| ${rider.sailNumber}`}
                                </p>
                              </div>
                              {auth.isHeadJudgeOrAdmin() && (
                                <Button
                                  variant={isParticipant ? "ghost" : "default"}
                                  size="sm"
                                  class={
                                    isParticipant ? "text-destructive hover:text-destructive" : ""
                                  }
                                  onClick={() =>
                                    isParticipant
                                      ? handleRemoveParticipant(rider.id)
                                      : handleAddParticipant(rider.id)
                                  }
                                >
                                  {isParticipant ? "Remove" : "Add"}
                                </Button>
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
                <Heading level={2} class="mb-3 sm:mb-4">
                  Current Participants ({data().participants.length})
                </Heading>
                <div class="bg-white shadow rounded-md max-h-96 overflow-y-auto">
                  {data().participants.length === 0 ? (
                    <p class="p-3 sm:p-4 text-xs sm:text-sm text-gray-500 text-center">
                      No participants yet
                    </p>
                  ) : (
                    <ul class="divide-y divide-gray-200">
                      <For each={data().participants}>
                        {(rider) => (
                          <li class="p-3 sm:p-4">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <div>
                                <Heading level={3} class="text-xs sm:text-sm font-medium">
                                  {rider.firstName} {rider.lastName}
                                </Heading>
                                <p class="text-xs sm:text-sm text-gray-600">
                                  {rider.country} {rider.sailNumber && `| ${rider.sailNumber}`}
                                </p>
                              </div>
                              {auth.isHeadJudgeOrAdmin() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  class="text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveParticipant(rider.id)}
                                >
                                  Remove
                                </Button>
                              )}
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
        </Match>
      </Switch>
    </div>
  );
};

export default DivisionParticipants;
