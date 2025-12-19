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

### Testing

The project includes comprehensive test coverage via unit and integration tests:

Run them with:

```bash
bun test
```

## Building and Deployment

```bash
docker build -t ws-scoring .
docker run -p 3000:3000 ws-scoring
```
