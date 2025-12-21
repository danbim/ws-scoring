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
- [PostgreSQL](https://www.postgresql.org/) database (for event persistence)

## Getting Started

### Install Dependencies

```bash
bun install
```

### Database Setup

The application uses PostgreSQL for event persistence. Set the `POSTGRESQL_CONNECTION_STRING` environment variable with your database connection details:

```bash
export POSTGRESQL_CONNECTION_STRING="postgresql://user:password@host:port/database"
```

If not provided, it defaults to `postgresql://localhost:5432/postgres`.

The event store will automatically create the necessary schema when the application starts.

### Run the Server

```bash
bun start
```

Or with a custom port:

```bash
PORT=8080 bun start
```

For example, with both custom port and database connection:

```bash
POSTGRESQL_CONNECTION_STRING="postgresql://user:password@localhost:5432/ws_scoring" PORT=8080 bun start
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

## Docker Compose

The project includes Docker Compose configurations for both local development and single-server deployment (e.g., Raspberry Pi, VM).

### Local Development

For local development with hot reload:

```bash
# Start services (postgres + app)
bun run docker:dev

# Or with rebuild
bun run docker:dev:build

# Stop services
bun run docker:dev:down
```

The application will be available at `http://localhost:3000` and PostgreSQL at `localhost:5432` (configurable via `POSTGRES_PORT` environment variable).

### Deployment (Single Server)

For deployment on a single server machine:

1. Create a `.env` file (copy from `.env.example` and customize):

```bash
cp .env.example .env
# Edit .env with your configuration
```

2. Start the services:

```bash
# Start in detached mode
bun run docker:up

# Or with rebuild
bun run docker:up:build

# View logs
bun run docker:logs

# Stop services
bun run docker:down
```

The application will be available on the configured `PORT` (default: 3000).

### Environment Variables

Create a `.env` file based on `.env.example`:

- `POSTGRES_USER` - PostgreSQL username (default: postgres)
- `POSTGRES_PASSWORD` - PostgreSQL password (default: postgres)
- `POSTGRES_DB` - Database name (default: ws_scoring)
- `POSTGRESQL_CONNECTION_STRING` - Full connection string (optional, overrides above)
- `PORT` - Application port (default: 3000)
- `CORS_ALLOWED_ORIGIN` - CORS allowed origin (default: http://localhost:3000)

## Database Management

### Reset Persistence Layer

Reset the event store to an empty state (truncates all event tables):

```bash
bun run db:reset
```

This preserves the database and schema, only clearing the event data.

### Seed Data

Load seed data into the database:

```bash
# Preview what will be created (dry run)
bun run db:seed:dry-run

# Actually seed the database
bun run db:seed
```

To customize seed data, edit `scripts/db/seed-data.ts`.

## Building and Deployment (Docker only)

```bash
docker build -t ws-scoring .
docker run -p 3000:3000 ws-scoring
```
