# Component Extraction: HeatScoreSheet and Divisions

## Problem

`HeatScoreSheet.tsx` (668 lines) and `Divisions.tsx` (656 lines) are the two largest files in the frontend. Each handles multiple concerns — data fetching, CRUD operations, modal state, and complex JSX layouts — making them hard to test, review, and modify independently.

## Design Decisions

- **No custom hooks extraction.** SolidJS `createResource`/`createSignal` are already declarative. The data fetching logic is short (~20 lines) and not reusable. Extracting hooks would add indirection without benefit.
- **Single `ScoreColumn` component** rather than separate wave/jump components. The two columns are structurally identical — only the jump column adds jumpType/modifier display, handled via conditional rendering.
- **`BracketSection` owns bracket + heat state.** Heats belong to brackets, so they're co-located. Participants are passed in as props since they belong to the division level.
- **No new directories or patterns.** New components go in the existing `src/app/components/` folder.

## HeatScoreSheet Decomposition

### New: `<ScoreColumn>` (~80 lines)

Renders one column of scores (wave or jump) for a single rider.

```
Props:
  type: "wave" | "jump"
  scores: ScoreWithMeta[]
  isOnline: boolean
  onAdd: () => void
  onEdit: (score: ScoreWithMeta) => void
  onDelete: (scoreUUID: string) => void
```

Contains:
- "Tap to add wave/jump" button
- Score list with edit/delete actions
- Format helpers (`formatJumpType`, `formatModifiers`, `formatTimestamp`) co-located here
- Jump-specific display (jumpType + modifiers) via conditional on `type` prop

### New: `<RiderScoreCard>` (~100 lines)

Full card for one rider: colored header + two ScoreColumn instances.

```
Props:
  riderId: string
  riderName: string
  sailNumber: string
  riderColor: string
  riderTotal: number
  waveScores: ScoreWithMeta[]
  jumpScores: ScoreWithMeta[]
  isOnline: boolean
  onAddWave: () => void
  onAddJump: () => void
  onEditWave: (score: ScoreWithMeta) => void
  onEditJump: (score: ScoreWithMeta) => void
  onDeleteWave: (scoreUUID: string) => void
  onDeleteJump: (scoreUUID: string) => void
```

Contains:
- Colored header bar with rider name, sail number, and total score
- Two `<ScoreColumn>` instances (wave + jump) in a two-column grid

### Modified: `HeatScoreSheet.tsx` (668 → ~350 lines)

Keeps:
- `createResource` for heat and riders data
- Online/offline detection effect
- Modal state signals and open/edit functions
- Score submission, deletion, and heat completion handlers
- Loading/error/not-found states
- Header with rules display and navigation links
- `<For each={riderIds}>` loop rendering `<RiderScoreCard>` instances
- Wave and Jump modal components at bottom
- Finish Heat button / Heat Completed banner

## Divisions Decomposition

### New: `<BracketSection>` (~300 lines)

Everything below the division detail header.

```
Props:
  divisionId: string
  seasonId: string
  contestId: string
  participants: Rider[]
```

Manages internally:
- Bracket loading, selection, CRUD handlers
- Bracket signals: `brackets`, `selectedBracket`, `showGenerateBracketModal`, `showCreateBracketModal`, `editingBracket`, `deletingBracket`
- Heat loading, CRUD
- Heat signals: `heats`, `showHeatForm`, `editingHeat`, `deletingHeat`
- Bracket selector dropdown
- Bracket detail panel with action buttons
- Format-specific views (SingleEliminationBracketView, double elimination placeholder, dingle placeholder)
- Heat card grid for non-bracket formats
- All bracket modals (generate, create, edit, delete) and heat modals (form, delete)

### Modified: `Divisions.tsx` (656 → ~250 lines)

Keeps:
- Division loading and tab selection
- Division CRUD handlers
- Division signals: `divisions`, `loading`, `selectedTab`, `showCreateModal`, `editingDivision`, `deletingDivision`
- Participant loading (`loadParticipants`)
- Tab navigation bar
- Division header with action buttons (Edit Participants, Edit Division, Delete Division)
- Division modals (create, edit, delete)
- Renders `<BracketSection>` inside the selected division panel

## File Changes Summary

New files:
- `src/app/components/ScoreColumn.tsx` (~80 lines)
- `src/app/components/RiderScoreCard.tsx` (~100 lines)
- `src/app/components/BracketSection.tsx` (~300 lines)

Modified files:
- `src/app/pages/HeatScoreSheet.tsx` (668 → ~350 lines)
- `src/app/pages/Divisions.tsx` (656 → ~250 lines)

## Testing

- Existing backend/integration tests are unaffected (pure frontend refactor)
- Run `bun typecheck` after each extraction to catch prop/import issues
- Run `bun run test:components:run` to verify no component test regressions
- Manual smoke test: scoring flow on HeatScoreSheet, division/bracket/heat CRUD on Divisions
