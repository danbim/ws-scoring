import type { Component } from "solid-js";
import { createEffect, createSignal, For, onMount } from "solid-js";
import type { Bracket, Heat, Rider } from "../types";
import HeatCard from "./HeatCard";

interface SingleEliminationBracketDesktopProps {
  bracket: Bracket;
  heats: Heat[];
  participants: Rider[];
  seasonId: string;
  contestId: string;
  divisionId: string;
  onHeatUpdate: () => void;
}

interface RoundData {
  roundNumber: number;
  roundName: string;
  heats: Heat[];
}

const SingleEliminationBracketDesktop: Component<SingleEliminationBracketDesktopProps> = (
  props
) => {
  let scrollContainerRef: HTMLDivElement | undefined;
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(true);

  // Group heats by round
  const rounds = (): RoundData[] => {
    const roundMap = new Map<number, RoundData>();

    for (const heat of props.heats) {
      if (!roundMap.has(heat.roundNumber)) {
        roundMap.set(heat.roundNumber, {
          roundNumber: heat.roundNumber,
          roundName: heat.roundName,
          heats: [],
        });
      }
      roundMap.get(heat.roundNumber).heats.push(heat);
    }

    return Array.from(roundMap.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  };

  const handleScroll = () => {
    if (!scrollContainerRef) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollLeft = () => {
    if (!scrollContainerRef) return;
    // Scroll by half a column for more gradual, visible animation
    scrollContainerRef.scrollBy({ left: -180, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (!scrollContainerRef) return;
    // Scroll by half a column for more gradual, visible animation
    scrollContainerRef.scrollBy({ left: 180, behavior: "smooth" });
  };

  onMount(() => {
    if (scrollContainerRef) {
      // Use requestAnimationFrame to ensure DOM is fully laid out
      requestAnimationFrame(() => {
        handleScroll();
      });
    }
  });

  // Update scroll state when heats change (content changes)
  createEffect(() => {
    // Track dependency on heats
    props.heats.length;

    if (scrollContainerRef) {
      // Delay to ensure DOM updates have completed
      requestAnimationFrame(() => {
        handleScroll();
      });
    }
  });

  return (
    <div class="relative">
      {/* Left Scroll Button */}
      <button
        type="button"
        onClick={scrollLeft}
        disabled={!canScrollLeft()}
        class="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full
               bg-white shadow-lg border border-gray-200
               flex items-center justify-center
               hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Scroll left"
      >
        ←
      </button>

      {/* Right Scroll Button */}
      <button
        type="button"
        onClick={scrollRight}
        disabled={!canScrollRight()}
        class="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full
               bg-white shadow-lg border border-gray-200
               flex items-center justify-center
               hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Scroll right"
      >
        →
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        class="overflow-x-auto overflow-y-visible px-16"
        style={{ "scroll-behavior": "smooth" }}
      >
        <div class="flex gap-20 py-4" style={{ "min-width": "min-content" }}>
          {/* Round Columns */}
          <For each={rounds()}>
            {(round) => (
              <div class="flex flex-col" style={{ width: "280px" }}>
                {/* Sticky Round Header */}
                <div class="sticky top-0 z-20 bg-white border-b-2 border-indigo-500 py-2 px-4 font-semibold text-lg text-gray-800 mb-4">
                  {round.roundName}
                </div>

                {/* Heat Cards */}
                <div class="space-y-4">
                  <For each={round.heats}>
                    {(heat) => (
                      <HeatCard
                        heat={heat}
                        participants={props.participants}
                        seasonId={props.seasonId}
                        contestId={props.contestId}
                        divisionId={props.divisionId}
                        bracketId={props.bracket.id}
                        onHeatUpdate={props.onHeatUpdate}
                      />
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

export default SingleEliminationBracketDesktop;
