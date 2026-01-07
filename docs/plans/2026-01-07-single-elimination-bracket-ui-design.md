# Single Elimination Bracket UI Component - Design Document

**Date:** 2026-01-07
**Feature:** Interactive Bracket Visualization for Single Elimination Format

## Overview

This design adds a visual bracket component that displays the single elimination tournament ladder, replacing the heat grid view in the Divisions page when a single elimination bracket exists. The component provides responsive layouts for desktop (scrollable ladder) and mobile (tabbed rounds).

## Component Architecture

### Component Hierarchy

```
SingleEliminationBracketView (main component)
├── SingleEliminationBracketDesktop (≥768px)
│   ├── ScrollControls (left/right buttons)
│   ├── RoundColumn (one per round)
│   │   ├── RoundHeader (sticky)
│   │   └── HeatCard[] (multiple)
│   └── ConnectionLines (SVG advancement paths)
└── SingleEliminationBracketMobile (<768px)
    └── RoundTabs
        └── HeatCard[] (vertical stack)
```

### File Structure

```
src/app/components/
├── SingleEliminationBracketView.tsx          # Main component, breakpoint detection
├── SingleEliminationBracketDesktop.tsx       # Desktop horizontal scrolling layout
├── SingleEliminationBracketMobile.tsx        # Mobile tabbed layout
└── HeatCard.tsx                              # Reusable heat card component

src/app/types.ts
└── (Extend Heat interface with new fields)

src/app/pages/
└── Divisions.tsx                             # Modified to conditionally render bracket view
```

## Data Model

### Type Extensions

Extend the `Heat` interface in `src/app/types.ts`:

```typescript
export interface Heat {
  heatId: string;
  position: string;
  roundNumber: number;
  roundName: string;
  riderIds: string[];
  heatRules: {
    wavesCounting: number;
    jumpsCounting: number;
  };
  scores: Array<{
    type: "wave" | "jump";
    scoreUUID: string;
    riderId: string;
    score: number;
    jumpType?: string;
    timestamp: string;
  }>;
  bracketId: string;
  completedAt: string | null;                 // NEW: explicit completion timestamp
  winnerDestinationHeatId: string | null;     // NEW: for advancement lines
  loserDestinationHeatId: string | null;      // NEW: for semi-finals
}
```

### Component Props

```typescript
interface SingleEliminationBracketViewProps {
  bracket: Bracket;
  heats: Heat[];
  participants: Rider[];
  seasonId: string;
  contestId: string;
  divisionId: string;
  onHeatUpdate: () => void;  // Callback to refresh data
}
```

### Internal State

```typescript
// Main component
const [isMobile, setIsMobile] = createSignal(false);
const [roundsData, setRoundsData] = createSignal<RoundData[]>([]);
const [riderLookup, setRiderLookup] = createSignal<Map<string, Rider>>(new Map());

// Desktop component
const [canScrollLeft, setCanScrollLeft] = createSignal(false);
const [canScrollRight, setCanScrollRight] = createSignal(true);

// Mobile component
const [selectedRound, setSelectedRound] = createSignal(1);
```

## Desktop Layout (≥768px)

### Visual Structure

```
┌─────────────────────────────────────────────────┐
│ [←]  Scrollable Bracket Area              [→]  │
│                                                 │
│ Round 1    Round 2    Semi-Finals    Finals    │
│ ═══════    ═══════    ═══════════    ══════    │ ← Sticky headers
│                                                 │
│ Heat 1a    Heat 3a    Heat 5         Heat 6    │
│ Heat 1b    Heat 3b                             │
│ Heat 2a                                        │
│ Heat 2b                                        │
│                                                 │
│ └─────→ └─────→ └─────→                       │ ← Connection lines
└─────────────────────────────────────────────────┘
```

### Scroll Controls

**Persistent Buttons**:
- Fixed position at left/right edges (outside scrollable area)
- Always visible but disabled at boundaries
- Circular buttons with arrow icons, semi-transparent background
- Click action: Smooth scroll by one round column width

**Scroll Detection**:
```typescript
const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement;
  setCanScrollLeft(container.scrollLeft > 0);
  setCanScrollRight(
    container.scrollLeft < container.scrollWidth - container.clientWidth
  );
};
```

### Round Columns

**Layout**:
- Each round is a vertical column with fixed width (280px)
- Columns arranged horizontally with gap spacing (80px for connection lines)
- Sticky round header at top of each column (z-index: 20)
- Heat cards stacked vertically with spacing (16px gap)

**Round Header Style**:
```typescript
class="sticky top-0 z-20 bg-white border-b-2 border-indigo-500
       py-2 px-4 font-semibold text-lg text-gray-800"
```

### Connection Lines

**SVG Layer**:
- Positioned absolutely between columns
- Green solid lines for winner advancement
- Red dashed lines for loser advancement (semi-finals only)

**Line Drawing**:
```typescript
// Winner path (green)
stroke="rgb(34, 197, 94)"  // green-500
stroke-width="2"
fill="none"

// Loser path (red, semi-finals only)
stroke="rgb(239, 68, 68)"  // red-500
stroke-width="2"
stroke-dasharray="4 2"  // Dashed to differentiate
fill="none"
```

## Mobile Layout (<768px)

### Visual Structure

```
┌─────────────────────────────────────┐
│ [Round 1] [Round 2] [Semi-Finals]   │ ← Scrollable tabs
│ ───────                             │
│                                     │
│ Heat 1a                             │
│ ┌─────────────────────────────────┐ │
│ │ Heat 1a               [📝]      │ │
│ │ Rider A (Winner)                │ │
│ │ Rider B                         │ │
│ │ 2W, 2J                          │ │
│ │ [View Results]                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Heat 1b                             │
│ ┌─────────────────────────────────┐ │
│ │ ...                             │ │
└─────────────────────────────────────┘
```

### Tab Navigation

**Tab Bar**:
```typescript
// Container
class="flex overflow-x-auto border-b border-gray-200 mb-4"

// Tab button (inactive)
class="px-4 py-2 text-sm font-medium text-gray-600
       whitespace-nowrap border-b-2 border-transparent
       hover:text-gray-800"

// Tab button (active)
class="px-4 py-2 text-sm font-medium text-indigo-600
       whitespace-nowrap border-b-2 border-indigo-600"
```

**Behavior**:
- One tab per round, labeled with `roundName`
- Active tab highlighted with underline
- Content area shows only heats for selected round
- Heats displayed as full-width cards, vertically stacked
- Default: Show Round 1 on initial load

**No Connection Lines**:
- Progression implied by rider names appearing in future rounds
- Simpler visualization appropriate for mobile

## Heat Card Component

### Status-Based Layout

```
┌─────────────────────────┐
│ Heat 3a            [📝] │ ← Position + Edit/Delete icons (admin/head judge)
├─────────────────────────┤
│ Rider 1 Name       [42] │ ← If complete: highlight winner, show sail number
│ Rider 2 Name       [15] │ ← Show in finishing order
│                         │
│ (or "Waiting..." if     │
│  riderIds empty)        │
├─────────────────────────┤
│ 2W, 2J                  │ ← Rules (compact)
│                         │
│ [Score Heat]            │ ← Contextual button
└─────────────────────────┘
```

### State-Based Rendering

**Incomplete Heat** (completedAt === null, has riders):
- Show riders in original order
- No winner highlighting
- Button: "Score Heat" (prominent, indigo) → navigates to score sheet

**Completed Heat** (completedAt !== null):
- Show riders in finishing order (1st, 2nd) based on score calculation
- Highlight winner with green border/background
- Button: "View Results" (secondary, gray) → navigates to score sheet
- Edit/Delete icons (small, top-right, head judge/admin only)

**Pending Heat** (riderIds empty):
- Show "Waiting for riders..." placeholder text
- Gray out the card (opacity-50)
- No action button

**Bye Heat** (single rider, completedAt !== null):
- Show single rider with "Bye" label
- Green highlight (auto-advanced)
- No action button needed

### Rider Display Logic

**With Sail Number** (preferred):
```typescript
<div class="flex items-center justify-between gap-2">
  <span class="truncate">{firstName} {lastName}</span>
  <span class="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
    {sailNumber}
  </span>
</div>
```

**Without Sail Number**:
```typescript
<span class="truncate">{firstName} {lastName}</span>
```

**Benefits**:
- Sail number never truncates (fixed width badge on the right)
- Long names truncate with ellipsis but identifier remains visible

### Styling

**Base Card**:
```typescript
// Normal state
class="bg-gray-50 rounded-lg p-3 border border-gray-200"

// Pending (no riders)
class="bg-gray-50 rounded-lg p-3 border border-gray-200 opacity-50"

// Completed with winner
class="bg-gray-50 rounded-lg p-3 border-l-4 border-l-green-500"
```

**Winner Highlighting**:
```typescript
// Winner rider row
class="font-semibold text-green-700 bg-green-50 px-2 py-1 rounded"

// Regular rider row
class="text-gray-700 px-2 py-1"
```

## Score Calculation & Winner Determination

### Using Existing Domain Logic

Import and use existing score calculator:
```typescript
import { calculateHeatResults } from '../../domain/heat/score-calculator';
```

### Winner Determination

```typescript
function getHeatRiderDisplay(heat: Heat, participants: Rider[]): RiderDisplay[] {
  // If heat not complete, show riders in original order
  if (!heat.completedAt) {
    return heat.riderIds.map(id => ({
      rider: participants.find(r => r.id === id)!,
      position: null,
      isWinner: false
    }));
  }

  // If complete, use domain calculator to get results
  const results = calculateHeatResults(heat);

  // Sort by position and map to display format
  return results
    .sort((a, b) => a.position - b.position)
    .map(result => ({
      rider: participants.find(r => r.id === result.riderId)!,
      position: result.position,
      isWinner: result.position === 1
    }));
}
```

### Error Handling

**Score calculation errors**:
```typescript
try {
  const results = calculateHeatResults(heat);
  // Use results normally
} catch (error) {
  console.error('Error calculating heat results:', error);
  // Fallback: show riders in original order, no highlighting
  return heat.riderIds.map(id => ({
    rider: participants.find(r => r.id === id)!,
    position: null,
    isWinner: false
  }));
}
```

## Integration with Divisions Page

### Conditional Rendering

Replace the heat grid in `Divisions.tsx` (around line 419) with conditional bracket view:

```typescript
<div class="mt-4">
  <h5 class="text-sm sm:text-base font-medium mb-3">
    {selectedBracket() ? 'Bracket' : 'Heats'}
  </h5>

  <Show when={selectedBracket()?.format === 'single_elimination'}>
    <SingleEliminationBracketView
      bracket={selectedBracket()!}
      heats={heats()}
      participants={participants()}
      seasonId={props.seasonId}
      contestId={props.contestId}
      divisionId={selectedDivision()!.id}
      onHeatUpdate={() => {
        loadHeats();
        loadParticipants();
      }}
    />
  </Show>

  <Show when={selectedBracket()?.format === 'double_elimination'}>
    {/* Future: DoubleEliminationBracketView */}
    <p class="text-sm text-gray-500">Double elimination view coming soon...</p>
  </Show>

  <Show when={selectedBracket()?.format === 'dingle'}>
    {/* Future: DingleBracketView */}
    <p class="text-sm text-gray-500">Dingle format view coming soon...</p>
  </Show>

  <Show when={!selectedBracket()}>
    {/* Existing heat grid code for non-bracket heats */}
  </Show>
</div>
```

### Data Flow

**Props passed to component**:
- All necessary data already loaded by existing `loadHeats()` and `loadParticipants()` functions
- `onHeatUpdate` callback allows component to trigger refresh after actions

**Navigation**:
- Uses same route pattern as existing heat navigation
- Route: `/seasons/${seasonId}/contests/${contestId}/divisions/${divisionId}/brackets/${bracketId}/heats/${heatId}`

## Error Handling & Edge Cases

### Data Validation

```typescript
// Component-level checks
if (!bracket || !heats().length) {
  return <p class="text-sm text-gray-500">No bracket data available.</p>;
}

if (!participants().length) {
  return <p class="text-sm text-gray-500">Loading participants...</p>;
}
```

### Rider Lookup Failure

```typescript
function getRiderDisplay(riderId: string, participants: Rider[]): string {
  const rider = participants.find(r => r.id === riderId);
  if (!rider) {
    return `Rider ${riderId.slice(0, 8)}...`; // Show partial ID
  }
  return `${rider.firstName} ${rider.lastName}`;
}
```

### Edge Cases

**Empty rounds** (shouldn't happen, defensive):
- Skip rendering that round column/tab

**Very long rider names**:
- Truncate name with ellipsis
- Always show sail number badge (if available) untruncated

**Small brackets (2-4 riders)**:
- Desktop: May look sparse with wide gaps (acceptable)
- Mobile: Works naturally with tabs

**Large brackets (32-64 riders)**:
- Desktop: First round has many heats, vertical scrolling handles it
- Mobile: Longer vertical scroll in Round 1 tab (acceptable)

**Navigation after heat deletion**:
- `onHeatUpdate()` refreshes data, component re-renders
- If all heats deleted, falls back to "No bracket data" message

**Bracket progression**:
- Component doesn't auto-refresh on its own
- User manually refreshes page or parent triggers reload
- Future enhancement: WebSocket/polling for live updates (out of scope)

## Styling & Design System

### Consistency with Existing UI

**Follow patterns from** `Divisions.tsx`:
- Tailwind CSS utility classes
- Color scheme: Indigo primary, red delete, green success/winner
- Responsive text: `text-xs sm:text-sm`
- Card style: `bg-gray-50 rounded-lg p-3 sm:p-4`

### Desktop Scroll Buttons

```typescript
class="absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full
       bg-white shadow-lg border border-gray-200
       flex items-center justify-center
       hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"

// Left button: left-4
// Right button: right-4
```

## Testing Approach

### Manual Testing Scenarios

1. **Small bracket (4 riders)**: Verify layout works, not too sparse
2. **Large bracket (32 riders)**: Verify scrolling, round headers stay visible
3. **Mobile viewport**: Verify tabs work, all heats accessible
4. **Complete a heat**: Verify winner highlighting, button changes to "View Results"
5. **Pending heat**: Verify "Waiting..." placeholder, no action button
6. **Bye heat**: Verify single rider display with "Bye" label
7. **Edit/Delete**: Verify buttons only appear for head judges/admins
8. **Long rider names**: Verify truncation with sail number badge visible
9. **Scroll buttons**: Verify disabled at boundaries, smooth scrolling
10. **Round headers**: Verify sticky behavior on desktop

## Implementation Order

1. **Extend Heat type** in `src/app/types.ts`
2. **Create HeatCard component** (reusable, easiest to test)
3. **Create SingleEliminationBracketMobile** (simpler, no SVG)
4. **Create SingleEliminationBracketDesktop** (more complex with SVG)
5. **Create SingleEliminationBracketView** (main component with breakpoint logic)
6. **Integrate with Divisions.tsx** (conditional rendering)
7. **Manual testing** across all scenarios

## Backend Dependencies

The frontend assumes these backend changes are complete:
- Heat API returns `completedAt`, `winnerDestinationHeatId`, `loserDestinationHeatId` fields
- Score calculation logic exists in `src/domain/heat/score-calculator.ts`

## Future Enhancements (Out of Scope)

- Real-time bracket updates via WebSocket/polling
- Animations for rider advancement
- Print/export bracket view
- Touch gestures for mobile scrolling
- Accessibility improvements (ARIA labels, keyboard navigation)
