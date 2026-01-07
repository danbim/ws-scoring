import type { Component } from "solid-js";
import { createSignal, onMount, onCleanup, Show } from "solid-js";
import SingleEliminationBracketDesktop from "./SingleEliminationBracketDesktop";
import SingleEliminationBracketMobile from "./SingleEliminationBracketMobile";
import type { Bracket, Heat, Rider } from "../types";

interface SingleEliminationBracketViewProps {
  bracket: Bracket;
  heats: Heat[];
  participants: Rider[];
  seasonId: string;
  contestId: string;
  divisionId: string;
  onHeatUpdate: () => void;
}

const SingleEliminationBracketView: Component<SingleEliminationBracketViewProps> = (props) => {
  const [isMobile, setIsMobile] = createSignal(false);

  // Check viewport width for mobile/desktop breakpoint (768px)
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
  });

  onCleanup(() => {
    window.removeEventListener('resize', checkMobile);
  });

  // Validation
  if (!props.bracket) {
    return <p class="text-sm text-gray-500">No bracket data available.</p>;
  }

  if (props.participants.length === 0) {
    return <p class="text-sm text-gray-500">Loading participants...</p>;
  }

  return (
    <div>
      <Show when={isMobile()}>
        <SingleEliminationBracketMobile
          bracket={props.bracket}
          heats={props.heats}
          participants={props.participants}
          seasonId={props.seasonId}
          contestId={props.contestId}
          divisionId={props.divisionId}
        />
      </Show>

      <Show when={!isMobile()}>
        <SingleEliminationBracketDesktop
          bracket={props.bracket}
          heats={props.heats}
          participants={props.participants}
          seasonId={props.seasonId}
          contestId={props.contestId}
          divisionId={props.divisionId}
        />
      </Show>
    </div>
  );
};

export default SingleEliminationBracketView;
