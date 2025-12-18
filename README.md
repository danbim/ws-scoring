# ws-scoring

A windsurfing wave contest judging application built with event sourcing using [Emmett](https://event-driven-io.github.io/emmett/). This system handles heat creation and score recording (waves and jumps) with full event sourcing capabilities.

## Features

- **Event Sourcing**: Built with Emmett's Decider pattern for event-driven architecture
- **Bun Runtime**: Fast JavaScript/TypeScript runtime
- **TypeScript**: Type-safe development
- **Biome**: Fast formatting and linting
- **Test-Driven Development**: Comprehensive test coverage with unit and integration tests

## Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://www.docker.com) installed (for building images)

## Getting Started

### Install Dependencies

```bash
bun install
```

### Run the Server

```bash
bun start
```

Or with a custom port:

```bash
PORT=8080 bun start
```

The server will be available at `http://localhost:3000` (or your custom port).

### Development

```bash
# Run the server in development mode
bun dev

# Run tests
bun test

# Format code
bun run format

# Lint code
bun run lint

# Format and lint (fixes issues automatically)
bun run check
```

## Heat Scoring System

### Architecture

The heat scoring system follows Emmett's **Decider Pattern**, which consists of three pure functions:

1. **`initialState()`**: Returns the initial state (null for non-existent heat)
2. **`decide(command, state)`**: Processes commands and returns events based on business rules
3. **`evolve(state, event)`**: Applies events to reconstruct the aggregate state

This pattern ensures:

- **Immutability**: All state updates return new objects
- **Testability**: Pure functions are easy to test
- **Event Sourcing**: Complete history of all state changes
- **Reconstruction**: State can be rebuilt from events at any time

### Domain Model

#### Commands

- **`CreateHeat`**: Creates a new heat with riders and scoring rules
- **`AddWaveScore`**: Records a wave score (0-10 scale) for a rider
- **`AddJumpScore`**: Records a jump score (0-10 scale) with jump type for a rider

#### Events

- **`HeatCreated`**: Emitted when a heat is created
- **`WaveScoreAdded`**: Emitted when a wave score is recorded
- **`JumpScoreAdded`**: Emitted when a jump score is recorded

#### Jump Types

Supported jump types: `forward`, `backloop`, `doubleForward`, `pushLoop`, `pushForward`, `tableTop`, `cheeseRoll`

### Usage Examples

#### Creating a Heat

```typescript
import {
  decide,
  evolve,
  initialState,
  type CreateHeat,
} from "./src/domain/heat/index.js";
import { getInMemoryEventStore } from "@event-driven-io/emmett";
import type { HeatEvent } from "./src/domain/heat/index.js";

const eventStore = getInMemoryEventStore<HeatEvent>();

// Create heat command
const createCommand: CreateHeat = {
  type: "CreateHeat",
  data: {
    heatId: "heat-1",
    riderIds: ["rider-1", "rider-2"],
    heatRules: {
      wavesCounting: 2, // Count best 2 waves
      jumpsCounting: 1, // Count best 1 jump
    },
  },
};

// Get current state (null for new heat)
let state = initialState();

// Decide on command - returns events
const events = decide(createCommand, state);

// Apply events to state
state = evolve(state, events[0]);

// Store events in event store
await eventStore.appendToStream("heat-heat-1", events);
```

#### Adding Wave Scores

```typescript
import { decide, evolve, type AddWaveScore } from "./src/domain/heat/index.js";

// Add wave score command
const waveCommand: AddWaveScore = {
  type: "AddWaveScore",
  data: {
    heatId: "heat-1",
    scoreUUID: "wave-1",
    riderId: "rider-1",
    waveScore: 8.5, // Score between 0-10
    timestamp: new Date("2024-01-01T10:00:00Z"),
  },
};

// Get current state from event store
const currentState = await eventStore.aggregateStream("heat-heat-1", {
  evolve,
  initialState,
});

// Decide on command
const events = decide(waveCommand, currentState.state);

// Store events
await eventStore.appendToStream("heat-heat-1", events);
```

#### Adding Jump Scores

```typescript
import { decide, type AddJumpScore } from "./src/domain/heat/index.js";

// Add jump score command
const jumpCommand: AddJumpScore = {
  type: "AddJumpScore",
  data: {
    heatId: "heat-1",
    scoreUUID: "jump-1",
    riderId: "rider-1",
    jumpScore: 9.0, // Score between 0-10
    jumpType: "forward", // One of: forward, backloop, doubleForward, pushLoop, pushForward, tableTop, cheeseRoll
    timestamp: new Date("2024-01-01T10:05:00Z"),
  },
};

const currentState = await eventStore.aggregateStream("heat-heat-1", {
  evolve,
  initialState,
});

const events = decide(jumpCommand, currentState.state);
await eventStore.appendToStream("heat-heat-1", events);
```

#### Reconstructing Heat State from Events

```typescript
import { aggregateStream } from "@event-driven-io/emmett";
import { evolve, initialState } from "./src/domain/heat/index.js";

// Reconstruct current state from all events
const result = await eventStore.aggregateStream("heat-heat-1", {
  evolve,
  initialState,
});

const heatState = result.state;

if (heatState) {
  console.log(`Heat ID: ${heatState.heatId}`);
  console.log(`Riders: ${heatState.riderIds.join(", ")}`);
  console.log(`Total Scores: ${heatState.scores.length}`);

  // Filter scores by type
  const waveScores = heatState.scores.filter((s) => s.type === "wave");
  const jumpScores = heatState.scores.filter((s) => s.type === "jump");

  console.log(`Wave Scores: ${waveScores.length}`);
  console.log(`Jump Scores: ${jumpScores.length}`);
}
```

#### Reading Events from Stream

```typescript
// Read all events from a stream
const readResult = await eventStore.readStream("heat-heat-1");

for (const event of readResult.events) {
  console.log(`Event: ${event.type}`, event.data);
}
```

### Validation Rules

The system enforces the following business rules:

- **CreateHeat**:

  - Heat ID must be unique (heat cannot already exist)
  - Must have at least one rider
  - Rider IDs must be unique
  - Heat rules must have positive counting values

- **AddWaveScore / AddJumpScore**:
  - Heat must exist
  - Rider must be in the heat
  - Score must be between 0 and 10 (inclusive)
  - Score UUID must be unique within the heat

### Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Test individual decider functions (`initialState`, `decide`, `evolve`)
- **Integration Tests**: Test full command → event → state flow using the event store

Run tests with:

```bash
bun test
```

Test coverage includes:

- Valid command scenarios
- Invalid command scenarios (validation errors)
- State reconstruction from events
- Edge cases (duplicate UUIDs, non-existent heats, etc.)

## Building and Deployment

```bash
docker build -t ws-scoring .
docker run -p 3000:3000 ws-scoring
```
