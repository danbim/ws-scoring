import type { Component } from "solid-js";
import { For } from "solid-js";
import type { JumpModifier, JumpType } from "@/domain/heat/types";

export interface ScoreWithMeta {
  scoreUUID: string;
  riderId: string;
  scoreValue: number;
  timestamp: string | Date;
  type: "wave" | "jump";
  jumpType: string | null;
  modifiers: JumpModifier[] | null;
  judgeId: string;
  isCounting: boolean;
}

function formatJumpType(jumpType: JumpType): string {
  const mapping: Record<JumpType, string> = {
    forward: "F",
    tableTop: "T",
    pushLoop: "P",
    backloop: "B",
    tableTopForward: "TF",
    doubleForward: "2xF",
    pushForward: "PF",
    tripleForward: "3xF",
    doubleBackloop: "2xB",
    doublePushLoop: "2xP",
    shaka: "Shaka",
    crazyPete: "CP",
    cheeseRoll: "CR",
    donkeyKick: "DK",
  };
  return mapping[jumpType] || jumpType;
}

function formatModifiers(modifiers: JumpModifier[]): string {
  if (!modifiers || modifiers.length === 0) return "";
  const mapping: Record<JumpModifier, string> = {
    oneHanded: "OH",
    oneFooted: "OF",
  };
  return `+${modifiers.map((m) => mapping[m]).join("+")}`;
}

function formatTimestamp(timestamp: string | Date): string {
  const timestampDate = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const seconds = Math.floor((Date.now() - timestampDate.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

interface ScoreColumnProps {
  type: "wave" | "jump";
  scores: ScoreWithMeta[];
  isOnline: boolean;
  onAdd: () => void;
  onEdit: (score: ScoreWithMeta) => void;
  onDelete: (scoreUUID: string) => void;
}

const ScoreColumn: Component<ScoreColumnProps> = (props) => {
  return (
    <div class="p-4">
      <div class="w-full text-left mb-3 font-semibold text-gray-900">
        {props.type === "wave" ? "WAVES" : "JUMPS"}
      </div>
      <div class="space-y-2">
        <button
          type="button"
          onClick={() => props.onAdd()}
          disabled={!props.isOnline}
          class="w-full py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:text-blue-600 disabled:hover:border-gray-300 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
        >
          Tap to add {props.type}
        </button>
        <For each={props.scores}>
          {(score) => {
            const classString = `w-full text-left p-3 rounded-md hover:bg-blue-50 hover:border-blue-300 border disabled:hover:bg-gray-50 disabled:hover:border-gray-200 disabled:cursor-not-allowed ${
              score.isCounting
                ? "bg-blue-50 border-blue-400 border-2"
                : "bg-gray-50 border-gray-200"
            }`;
            return (
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => props.onEdit(score)}
                  disabled={!props.isOnline}
                  class={`flex-1 ${classString}`}
                >
                  <div class="flex items-center gap-2">
                    <div class="font-bold text-xl text-gray-900">
                      {score.scoreValue.toFixed(2)}
                      {props.type === "jump" && (
                        <span class="text-sm font-normal text-gray-600">
                          {" "}(
                          {score.jumpType
                            ? formatJumpType(score.jumpType as JumpType)
                            : ""}
                          {score.modifiers
                            ? formatModifiers(score.modifiers as JumpModifier[])
                            : ""}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {formatTimestamp(score.timestamp)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(score.scoreUUID);
                  }}
                  disabled={!props.isOnline}
                  class="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  title="Delete score"
                  aria-label="Delete score"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default ScoreColumn;
