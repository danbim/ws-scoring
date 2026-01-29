import { useNavigate } from "@solidjs/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";
import { createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import type { Bracket, HeatListItem, Rider } from "../types";
import { orpc } from "../utils/orpc";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import EntityFormModal from "./EntityFormModal";
import HeatCreationForm from "./HeatCreationForm";
import SingleEliminationBracketView from "./SingleEliminationBracketView";
import { Button } from "@/components/ui/button";
import Heading from "./ui/Heading";

interface BracketSectionProps {
  divisionId: string;
  seasonId: string;
  contestId: string;
  participants: Rider[];
  onParticipantsChanged: () => void;
}

const BracketSection: Component<BracketSectionProps> = (props) => {
  const [selectedBracket, setSelectedBracket] = createSignal<Bracket | null>(null);
  const [showGenerateBracketModal, setShowGenerateBracketModal] = createSignal(false);
  const [showCreateBracketModal, setShowCreateBracketModal] = createSignal(false);
  const [editingBracket, setEditingBracket] = createSignal<Bracket | null>(null);
  const [deletingBracket, setDeletingBracket] = createSignal<Bracket | null>(null);
  const [showHeatForm, setShowHeatForm] = createSignal(false);
  const [editingHeat, setEditingHeat] = createSignal<HeatListItem | null>(null);
  const [deletingHeat, setDeletingHeat] = createSignal<HeatListItem | null>(null);

  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const bracketsQuery = useQuery(() => ({
    ...orpc.bracket.list.queryOptions({ input: { divisionId: props.divisionId } }),
    enabled: !!props.divisionId,
    select: (data) => data.brackets,
  }));

  const heatsQuery = useQuery(() => ({
    ...orpc.heat.list.queryOptions({ input: { bracketId: selectedBracket()?.id ?? "" } }),
    enabled: !!selectedBracket(),
    select: (data) => data.heats,
  }));

  createEffect(() => {
    // biome-ignore lint/correctness/noUnusedVariables: required to react to divisionId changes
    const noticeDivisionIdUpdate = props.divisionId;
    setSelectedBracket(null);
  });

  // Auto-select first bracket when data changes
  createEffect(() => {
    const brackets = bracketsQuery.data;
    if (brackets && brackets.length > 0 && !selectedBracket()) {
      setSelectedBracket(brackets[0]);
    }
  });

  const getHeatRiders = (heat: HeatListItem): Rider[] => {
    return heat.riderIds
      .map((id) => props.participants.find((r) => r.id === id))
      .filter((r): r is Rider => r !== undefined);
  };

  const generateMut = useMutation(() =>
    orpc.bracket.generate.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.bracket.key() });
      },
    })
  );

  const createBracketMut = useMutation(() =>
    orpc.bracket.create.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.bracket.key() });
      },
    })
  );

  const updateBracketMut = useMutation(() =>
    orpc.bracket.update.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.bracket.key() });
      },
    })
  );

  const deleteBracketMut = useMutation(() =>
    orpc.bracket.delete.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.bracket.key() });
      },
    })
  );

  const deleteHeatMut = useMutation(() =>
    orpc.heat.delete.mutationOptions({
      onSuccess: () => {
        return queryClient.invalidateQueries({ queryKey: orpc.heat.key() });
      },
    })
  );

  const handleGenerateBracket = async (_formData: Record<string, unknown>) => {
    try {
      await generateMut.mutateAsync({
        divisionId: props.divisionId,
        format: "single_elimination" as const,
      });
      setShowGenerateBracketModal(false);
    } catch (error) {
      console.error("Error creating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to create bracket");
    }
  };

  const handleCreateBracket = async (formData: Record<string, unknown>) => {
    try {
      await createBracketMut.mutateAsync({
        divisionId: props.divisionId,
        ...(formData as {
          name: string;
          format: "single_elimination" | "double_elimination" | "dingle";
          status: string;
        }),
      });
      setShowCreateBracketModal(false);
    } catch (error) {
      console.error("Error creating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to create bracket");
    }
  };

  const handleUpdateBracket = async (formData: Record<string, unknown>) => {
    const bracket = editingBracket();
    if (!bracket) return;
    try {
      await updateBracketMut.mutateAsync({
        bracketId: bracket.id,
        data: formData as {
          divisionId?: string;
          name?: string;
          format?: "single_elimination" | "double_elimination" | "dingle";
          status?: string;
        },
      });
      setEditingBracket(null);
    } catch (error) {
      console.error("Error updating bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to update bracket");
    }
  };

  const handleDeleteBracket = async () => {
    const bracket = deletingBracket();
    if (!bracket) return;
    try {
      await deleteBracketMut.mutateAsync({ bracketId: bracket.id });
      setDeletingBracket(null);
    } catch (error) {
      console.error("Error deleting bracket:", error);
      alert(error instanceof Error ? error.message : "Failed to delete bracket");
    }
  };

  const generateBracketFields = [
    {
      name: "format",
      label: "Format",
      type: "select" as const,
      required: true,
      options: [{ value: "single_elimination", label: "Single Elimination" }],
    },
  ];

  const bracketFields = [
    { name: "name", label: "Name", type: "text" as const, required: true },
    ...generateBracketFields,
    { name: "status", label: "Status", type: "text" as const, required: true },
  ];

  return (
    <div class="mt-6">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <Heading level={3}>Brackets</Heading>
        {auth.isHeadJudgeOrAdmin() && (
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              class="w-full sm:w-auto"
              onClick={() => setShowGenerateBracketModal(true)}
            >
              Generate Bracket
            </Button>
            <Button
              size="sm"
              class="w-full sm:w-auto"
              onClick={() => setShowCreateBracketModal(true)}
            >
              Manually Create Bracket
            </Button>
          </div>
        )}
      </div>

      <Switch>
        <Match when={bracketsQuery.isPending}>
          <div class="text-center py-4 text-sm text-gray-500">Loading brackets...</div>
        </Match>
        <Match when={bracketsQuery.data}>
          {(brackets) => (
            <Show
              when={brackets().length > 0}
              fallback={
                <p class="text-xs sm:text-sm text-gray-500">No brackets in this division yet.</p>
              }
            >
              <div class="mb-4">
                <label
                  for="bracket-select-division"
                  class="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                >
                  Select Bracket:
                </label>
                <select
                  id="bracket-select-division"
                  value={selectedBracket()?.id || ""}
                  onChange={(e) => {
                    const bracket = brackets().find((b) => b.id === e.currentTarget.value);
                    setSelectedBracket(bracket || null);
                  }}
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {brackets().map((bracket) => (
                    <option value={bracket.id}>{bracket.name}</option>
                  ))}
                </select>
              </div>

              {selectedBracket() && (
                <div class="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                    <Heading level={4}>{selectedBracket()?.name}</Heading>
                    {auth.isHeadJudgeOrAdmin() && (
                      <div class="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setShowHeatForm(true)}>
                          Create Heat
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const bracket = selectedBracket();
                            if (bracket) setEditingBracket(bracket);
                          }}
                        >
                          Edit Bracket
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const bracket = selectedBracket();
                            if (bracket) setDeletingBracket(bracket);
                          }}
                        >
                          Delete Bracket
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Bracket or Heats */}
                  <div class="mt-4">
                    <Heading level={5} class="mb-3">
                      {selectedBracket() ? "Bracket" : "Heats"}
                    </Heading>

                    <Switch>
                      <Match when={heatsQuery.isPending}>
                        <div class="text-center py-4 text-sm text-gray-500">Loading heats...</div>
                      </Match>
                      <Match when={heatsQuery.data}>
                        {(heats) => (
                          <>
                            <Show
                              when={
                                selectedBracket()?.format === "single_elimination"
                                  ? selectedBracket()
                                  : undefined
                              }
                            >
                              {(bracket) => (
                                <SingleEliminationBracketView
                                  bracket={bracket()}
                                  heats={heats()}
                                  participants={props.participants}
                                  seasonId={props.seasonId}
                                  contestId={props.contestId}
                                  divisionId={props.divisionId}
                                  onHeatUpdate={() => {
                                    queryClient.invalidateQueries({ queryKey: orpc.heat.key() });
                                    props.onParticipantsChanged();
                                  }}
                                />
                              )}
                            </Show>

                            <Show when={selectedBracket()?.format === "double_elimination"}>
                              <p class="text-sm text-gray-500">
                                Double elimination view coming soon...
                              </p>
                            </Show>

                            <Show when={selectedBracket()?.format === "dingle"}>
                              <p class="text-sm text-gray-500">Dingle format view coming soon...</p>
                            </Show>

                            <Show when={!selectedBracket()}>
                              {heats().length === 0 ? (
                                <p class="text-xs sm:text-sm text-gray-500">
                                  No heats in this bracket yet.
                                </p>
                              ) : (
                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                  {heats().map((heat) => (
                                    <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                                      <button
                                        type="button"
                                        class="cursor-pointer hover:bg-gray-100 transition-colors text-left w-full"
                                        onClick={() => {
                                          const bracket = selectedBracket();
                                          if (bracket) {
                                            navigate(
                                              `/seasons/${props.seasonId}/contests/${props.contestId}/divisions/${props.divisionId}/brackets/${bracket.id}/heats/${heat.heatId}`
                                            );
                                          }
                                        }}
                                        aria-label={`View ${heat.roundName} - Heat ${heat.position}`}
                                      >
                                        <Heading level={6}>
                                          {heat.roundName} - Heat {heat.position}
                                        </Heading>
                                        <div class="mt-2 space-y-1">
                                          {getHeatRiders(heat).map((rider) => (
                                            <p class="text-xs sm:text-sm text-gray-700">
                                              {rider.firstName} {rider.lastName}
                                              {rider.sailNumber && ` (${rider.sailNumber})`}
                                            </p>
                                          ))}
                                        </div>
                                        <p class="text-xs sm:text-sm text-gray-500 mt-2">
                                          Rules: {heat.heatRules.wavesCounting} waves,{" "}
                                          {heat.heatRules.jumpsCounting} jumps | Scores:{" "}
                                          {heat.scores.length}
                                        </p>
                                      </button>
                                      {auth.isHeadJudgeOrAdmin() && (
                                        <div class="mt-2 sm:mt-3 flex space-x-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingHeat(heat);
                                              setShowHeatForm(true);
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
                                              setDeletingHeat(heat);
                                            }}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Show>
                          </>
                        )}
                      </Match>
                    </Switch>
                  </div>
                </div>
              )}
            </Show>
          )}
        </Match>
      </Switch>

      {/* Bracket Modals */}
      <EntityFormModal
        isOpen={showGenerateBracketModal()}
        title="Generate Bracket"
        entity={null}
        onSave={handleGenerateBracket}
        onCancel={() => setShowGenerateBracketModal(false)}
        fields={generateBracketFields}
      />

      <EntityFormModal
        isOpen={showCreateBracketModal()}
        title="Create Bracket"
        entity={null}
        onSave={handleCreateBracket}
        onCancel={() => setShowCreateBracketModal(false)}
        fields={bracketFields}
      />

      <EntityFormModal
        isOpen={editingBracket() !== null}
        title="Edit Bracket"
        entity={editingBracket()}
        onSave={handleUpdateBracket}
        onCancel={() => setEditingBracket(null)}
        fields={bracketFields}
      />

      <DeleteConfirmationModal
        isOpen={deletingBracket() !== null}
        entityName={deletingBracket()?.name || ""}
        entityType="bracket"
        onConfirm={handleDeleteBracket}
        onCancel={() => setDeletingBracket(null)}
      />

      {/* Heat Form */}
      <Show when={showHeatForm() && selectedBracket()}>
        <HeatCreationForm
          bracketId={selectedBracket()?.id || ""}
          participants={props.participants}
          heat={editingHeat()}
          onClose={() => {
            setShowHeatForm(false);
            setEditingHeat(null);
          }}
          onSuccess={() => {
            setShowHeatForm(false);
            setEditingHeat(null);
            queryClient.invalidateQueries({ queryKey: orpc.heat.key() });
          }}
        />
      </Show>

      {/* Heat Delete Modal */}
      <DeleteConfirmationModal
        isOpen={deletingHeat() !== null}
        entityName={(() => {
          const heat = deletingHeat();
          return heat ? `${heat.roundName} - Heat ${heat.position}` : "";
        })()}
        entityType="heat"
        onConfirm={async () => {
          const heat = deletingHeat();
          if (heat) {
            try {
              await deleteHeatMut.mutateAsync({ heatId: heat.heatId });
              setDeletingHeat(null);
            } catch (error) {
              console.error("Error deleting heat:", error);
              alert(error instanceof Error ? error.message : "Failed to delete heat");
            }
          }
        }}
        onCancel={() => setDeletingHeat(null)}
      />
    </div>
  );
};

export default BracketSection;
