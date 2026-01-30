import type { Component } from "solid-js";
import type { ScoreWithMeta } from "./ScoreColumn";
import ScoreColumn from "./ScoreColumn";

interface RiderScoreCardProps {
  riderName: string;
  sailNumber: string;
  riderColor: string;
  riderTotal: number;
  waveScores: ScoreWithMeta[];
  jumpScores: ScoreWithMeta[];
  onAddWave: () => void;
  onAddJump: () => void;
  onEditWave: (score: ScoreWithMeta) => void;
  onEditJump: (score: ScoreWithMeta) => void;
  onDeleteWave: (scoreUUID: string) => void;
  onDeleteJump: (scoreUUID: string) => void;
}

const RiderScoreCard: Component<RiderScoreCardProps> = (props) => {
  return (
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Rider Header */}
      <div
        class="px-4 py-3 text-white flex justify-between items-center"
        style={{ "background-color": props.riderColor }}
      >
        <div>
          <div class="font-bold text-lg">{props.riderName}</div>
          <div class="text-sm opacity-90">Sail: {props.sailNumber}</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-lg">{props.riderTotal.toFixed(2)}</div>
        </div>
      </div>

      {/* Scores Grid */}
      <div class="grid grid-cols-2 divide-x divide-gray-200">
        <ScoreColumn
          type="wave"
          scores={props.waveScores}
          onAdd={props.onAddWave}
          onEdit={props.onEditWave}
          onDelete={props.onDeleteWave}
        />
        <ScoreColumn
          type="jump"
          scores={props.jumpScores}
          onAdd={props.onAddJump}
          onEdit={props.onEditJump}
          onDelete={props.onDeleteJump}
        />
      </div>
    </div>
  );
};

export default RiderScoreCard;
