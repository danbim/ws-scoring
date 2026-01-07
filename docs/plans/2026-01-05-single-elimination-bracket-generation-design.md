# Single Elimination Bracket Generation - Design Document

**Date:** 2026-01-05
**Feature:** Contest Division Single Elimination Bracket Generation

## Overview

This design adds functionality to generate Single Elimination brackets for contest divisions in the PWA windsurfing scoring system. The bracket generation follows PWA Wave Performance rules where heats contain 2 riders competing head-to-head, with parallel heats (e.g., "1a" and "1b") running simultaneously.

## Architecture

### System Flow

1. User clicks "Generate Bracket" button in UI for a division
2. Backend generates complete bracket structure with all heats
3. Round 1 heats have riders assigned (randomly seeded, with byes for top seeds if needed)
4. Future round heats are created but have empty `riderIds` (populated as earlier heats complete)
5. When a heat completes (via event sourcing), an event listener updates destination heats' `riderIds`

### Data Architecture

- **Relational layer**: Bracket structure, rounds, heat metadata, advancement rules
- **Event-sourced layer**: Individual heat lifecycle (scoring, completion)
- **Integration point**: Heat completion events trigger relational updates for bracket progression

### Key Components

1. Database schema changes (extend `heats` table)
2. Bracket generation service (pure business logic)
3. API endpoint for bracket generation
4. Heat completion event and command
5. Event listener for heat completion → bracket progression
6. UI components for bracket visualization and interaction

## Database Schema Changes

### Extend `heats` Table

Add the following columns to the existing `heats` table:

```typescript
roundNumber: integer("round_number"),           // e.g., 1, 2, 3
roundName: text("round_name"),                  // e.g., "Round 1", "Semi-Finals", "Final"
position: text("position"),                     // e.g., "1a", "1b", "3a", "4", "5"
winnerDestinationHeatId: text("winner_destination_heat_id")
  .references(() => heats.heatId),             // Where winner advances
loserDestinationHeatId: text("loser_destination_heat_id")
  .references(() => heats.heatId),             // Where loser advances (semis only)
```

### Indexes

Add the following indexes for efficient querying:

- `roundNumberIdx` on `roundNumber` (query heats by round)
- `positionIdx` on `position` (bracket UI display ordering)

### Heat Status (Derived from riderIds)

Heat readiness is derived from the existing `riderIds` JSON field:

- Empty array `[]` → pending (waiting for riders)
- One rider → partial/bye (waiting for opponent, or auto-advance for bye)
- Two riders → ready (can be started)

For actual heat state (in_progress, completed), query the event store using existing infrastructure.

### Migration

Create a new Drizzle migration to add these columns to the existing `heats` table.

## Bracket Generation Algorithm

### Input

- Division ID
- List of participant rider IDs from `division_participants`

### Steps

1. **Validate participant count**
   - Must be ≥ 2 riders and ≤ 64 riders
   - Error if outside this range

2. **Handle special cases:**
   - **2 riders**: Create single heat "1" (Final), roundNumber=1, roundName="Final"
   - **3 riders**: Create 4-rider bracket with 1 bye (seed 1 gets bye to final)

3. **Calculate bracket size (for 4+ riders)**
   - Find next power of 2: `bracketSize = nextPowerOf2(participantCount)`
   - Examples: 6 riders → 8 bracket, 12 riders → 16 bracket

4. **Determine byes**
   - `byeCount = bracketSize - participantCount`
   - Top seeds (positions 1 through byeCount) get byes in Round 1

5. **Random seeding**
   - Shuffle participants randomly
   - Assign positions 1 to participantCount

6. **Generate bracket structure**
   - Calculate rounds based on bracket size
   - Create heats with proper naming (1a/1b, 2a/2b, 3a/3b, then numbered finals)
   - Round 1 heats: Assign riders using bracket pairing (1v8, 4v5, 2v7, 3v6 scaled to size)
   - Handle byes: Single-rider heats with auto-advance
   - Future rounds: Empty `riderIds`, set advancement heat IDs

## Heat Naming and Round Structure

### Heat Numbering Pattern

**2 riders (special case):**
- Round 1: Heat "1" (Final)

**4 riders:**
- Round 1: Heats "1a", "1b" (Semi-finals)
- Round 2: Heat "2" (Runners-up Final)
- Round 3: Heat "3" (Final)

**8 riders:**
- Round 1: Heats "1a", "1b", "2a", "2b" (Quarterfinals)
- Round 2: Heats "3a", "3b" (Semi-finals)
- Round 3: Heat "4" (Runners-up Final)
- Round 4: Heat "5" (Final)

**16 riders:**
- Round 1: Heats "1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b" (Round of 16)
- Round 2: Heats "5a", "5b", "6a", "6b" (Quarterfinals)
- Round 3: Heats "7a", "7b" (Semi-finals)
- Round 4: Heat "8" (Runners-up Final)
- Round 5: Heat "9" (Final)

### Naming Pattern Rules

- Each pair gets consecutive numbers with a/b suffixes
- Counter increments continuously across all rounds
- Last two heats drop the suffix (numbered finals)

## Advancement Rules and Heat Relationships

### General Rules

- **All heats except final**: `winnerDestinationHeatId` points to next round heat
- **Semi-finals only**: `loserDestinationHeatId` points to runners-up final
- **Finals (both runners-up and main)**: Both destination fields are `null`

### Example: 8-Rider Bracket Advancement

**Round 1 (Quarterfinals):**
- Heat "1a": winner → "3a", loser → null
- Heat "1b": winner → "3a", loser → null
- Heat "2a": winner → "3b", loser → null
- Heat "2b": winner → "3b", loser → null

**Round 2 (Semi-finals):**
- Heat "3a": winner → "5" (Final), loser → "4" (Runners-up Final)
- Heat "3b": winner → "5" (Final), loser → "4" (Runners-up Final)

**Round 3 & 4 (Finals):**
- Heat "4" (Runners-up): winner → null, loser → null
- Heat "5" (Final): winner → null, loser → null

### Pairing Logic

- Winners of heats XYa and XYb go to the same next heat
- In semi-finals, both heats' winners go to final, both losers to runners-up final

## Heat Completion Event and API

### New Domain Event

```typescript
type HeatCompleted = Event<
  'HeatCompleted',
  {
    heatId: string;
    completedAt: Date;
    // Winner/loser determined by score calculation, not stored in event
  }
>;
```

### New Command

```typescript
type CompleteHeat = Command<
  'CompleteHeat',
  {
    heatId: string;
    completedAt: Date;
  }
>;
```

### Decider Logic

- `decide()`: Validate heat has scores, emit `HeatCompleted` event
- `evolve()`: Update heat state to mark as completed

### New API Endpoint

```
POST /api/heats/:heatId/complete
```

- Triggers `CompleteHeat` command
- Returns success/error
- Event listener handles bracket advancement automatically

### Bye Handling

- When generating bracket, immediately emit `HeatCompleted` for bye heats (single rider)
- This cascades through bracket until hitting a heat needing 2 riders

## Heat Completion Event Listener

### Event-Driven Bracket Progression

Subscribe to `HeatCompleted` events to advance riders through the bracket.

### Event Handler Logic

```typescript
onHeatCompleted(heatId, eventData) {
  // 1. Query heat from relational DB to get advancement rules
  const heat = getHeatById(heatId);

  // 2. Reconstruct heat state from event store to determine winner/loser
  const heatState = reconstructHeatState(heatId);
  const results = calculateRiderScoreTotals(heatState);
  const [winner, loser] = determineWinnerAndLoser(results);

  // 3. Update destination heats
  if (heat.winnerDestinationHeatId) {
    addRiderToHeat(heat.winnerDestinationHeatId, winner);
  }

  if (heat.loserDestinationHeatId) {
    addRiderToHeat(heat.loserDestinationHeatId, loser);
  }

  // 4. Handle byes: if destination heat now has 1 rider and should auto-advance
  checkAndProcessByes(heat.winnerDestinationHeatId);
}
```

### Bye Auto-Advancement

- If a heat has only 1 rider (bye), automatically mark it complete and advance that rider
- Creates cascade effect through bracket

## Bracket Generation API Endpoint

### Endpoint

```
POST /api/divisions/:divisionId/brackets/generate
```

### Request Body

```typescript
{
  format: "single_elimination"  // For now, only this value
}
```

### Response

```typescript
{
  bracketId: string,
  divisionId: string,
  format: "single_elimination",
  participantCount: number,
  bracketSize: number,
  byeCount: number,
  rounds: Array<{
    roundNumber: number,
    roundName: string,
    heats: Array<{
      heatId: string,
      position: string,
      riderIds: string[],
      winnerDestinationHeatId: string | null,
      loserDestinationHeatId: string | null
    }>
  }>
}
```

### Validation

- Division must exist
- Division must have 2-64 participants
- Division cannot already have a bracket (no regeneration allowed)

### Transaction Handling

- Create bracket record
- Create all heat records (using existing CreateHeat command/infrastructure)
- Auto-complete bye heats immediately
- All or nothing (rollback if any step fails)

## UI Integration and Display

### Frontend Functionality

1. **Display bracket structure:**
   - Query: `GET /api/brackets/:bracketId` (returns structure with all heats)
   - Visual bracket display showing rounds, heat positions, rider names
   - Highlight heats by status (pending/ready/in-progress/completed)

2. **Show heat progression:**
   - Display advancement arrows (winner/loser destinations)
   - Show which riders have advanced and which heats are waiting

3. **Handle generation:**
   - Call `POST /api/divisions/:divisionId/brackets/generate`
   - Show loading state during generation
   - Navigate to bracket view on success
   - Handle errors (already exists, not enough participants, etc.)

4. **Heat management from bracket view:**
   - Click heat to view/judge it (existing functionality)
   - Complete heat button triggers `POST /api/heats/:heatId/complete`
   - Auto-refresh to show progression after completion

### Data Requirements for UI

- Bracket structure with rounds
- Heat positions and rider assignments
- Heat statuses (derived from riderIds and event store)
- Advancement paths for visual display

## Testing Strategy

### Unit Tests

- Bracket generation algorithm (all bracket sizes: 2, 3, 4, 8, 16, 32, 64)
- Bye calculation and placement
- Heat naming logic
- Advancement rule assignment
- Winner/loser determination from scores

### Integration Tests

- Full bracket generation flow (API → DB → heats created)
- Heat completion → rider advancement
- Bye cascade (multiple byes advancing through rounds)
- Event listener integration

### Edge Cases

- Minimum (2 riders) and maximum (64 riders) brackets
- Non-power-of-2 counts requiring byes
- All positions get correct advancement rules
- Finals have no destination heats

## Implementation Order

1. Database migration (add columns to heats table)
2. Bracket generation core algorithm (pure functions, easily testable)
3. Heat completion event and command (extend Decider)
4. Event listener for bracket progression
5. API endpoints (generate bracket, complete heat)
6. UI updates (bracket display, completion triggers)

## Key Deliverables

### Backend

- Extended schema with 5 new heat columns (roundNumber, roundName, position, winnerDestinationHeatId, loserDestinationHeatId)
- Bracket generation service supporting 2-64 riders with random seeding and bye handling
- Heat completion event, command, and API endpoint
- Event-driven bracket progression with automatic bye advancement
- Full test coverage

### Frontend

- Bracket visualization displaying rounds, heats, and rider assignments
- Visual advancement paths showing winner/loser destinations
- Integration with existing "Generate Bracket" button
- Complete heat functionality from bracket view
- Real-time bracket progression updates after heat completion
- Error handling (bracket already exists, insufficient participants)
