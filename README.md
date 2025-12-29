# ws-scoring

A windsurfing wave contest judging application built with event sourcing using [Emmett](https://event-driven-io.github.io/emmett/). This system handles heat creation and score recording (waves and jumps) with full event sourcing capabilities.

## Features

- **Event Sourcing**: Built with Emmett's Decider pattern for event-driven architecture
- **Authentication**: Session-based authentication with role-based access control (judge, head_judge, administrator)
- **User Management**: Scripts for creating, updating, and managing users
- **Frontend Application**: SolidJS single-page application with Tailwind CSS
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

The application uses PostgreSQL for

* event persistence (using [Emmett](https://event-driven-io.github.io/emmett/)), and
* user/session management (using [Drizzle](https://orm.drizzle.team)).

Make sure you have a PostgreSQL instance running, e.g. by starting a corresponding Docker container:

```bash
docker run -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ws_scoring -p 5432:5432 postgres:18-alpine
```

Set the `POSTGRESQL_CONNECTION_STRING` environment variable with your database connection details:

```bash
export POSTGRESQL_CONNECTION_STRING="postgresql://user:password@host:port/database"
```

If not provided, it defaults to `postgresql://localhost:5432/postgres`.

The event store will automatically create the necessary schema when the application starts.

#### Drizzle Database Migrations

The application uses Drizzle ORM for database schema management. To set up the database schema:

```bash
# Generate migration files from schema changes
bun run db:generate

# Apply migrations to the database
bun run db:migrate
```

This will create the `users` and `sessions` tables required for authentication.

### Development (without docker-compose)

Ensure PostgreSQL is up and running on port 5432. In development, the application uses 2 servers:

* Frontend dev server, running on port 5173 (hot-reloads frontend code using [Vite](https://vite.dev)). 
  The Vite dev server automatically proxies `/api/*` requests to the API server.
* API server, running on port 3000 (hot-reloads backend code using [Bun](https://bun.com)).

```bash
# Terminal 1: Start the API server (port 3000)
bun run dev:api

# Terminal 2: Start the vite dev frontend server (port 5173)
bun run dev:app
```

* Frontend is available at: `http://localhost:5173`.
* API server runs at: `http://localhost:3000`.

Alternatively, use Docker Compose to run everything together (see docker-compose section below).

# Testing

Tests are running in an in-memory event store, so the env var `USE_IN_MEMORY_EVENT_STORE` must be set to `true` when
running tests. This can be done automatically by running:

```bash
bun run test
```

# Code Formatting
```bash
bun run format
```


# Code Linting
```bash
bun run lint
```

# Formatting and Linting (fixes fixable issues automatically)
bun run check:fix
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

## Docker Compose

The project includes Docker Compose configurations for both local development and single-server deployment.

### Local Development

For local development with hot reload:

```bash
# Start services (postgres + app + vite)
bun run docker:dev

# Or with rebuild
bun run docker:dev:build
```

### Deployment (Single Server)

For deployment on a single server machine:

> **⚠️ SECURITY WARNING**: The default PostgreSQL credentials in `.env.example` are placeholders only. **You must set strong, unique credentials** for production deployments. Never use weak passwords like "postgres" in production environments.

1. Create a `.env` file (copy from `.env.example` and customize):

```bash
cp .env.example .env
# Edit .env with your configuration
# IMPORTANT: Set strong POSTGRES_USER and POSTGRES_PASSWORD values!
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

- `POSTGRES_USER` - PostgreSQL username (required for production, no default)
- `POSTGRES_PASSWORD` - PostgreSQL password (required for production, no default)
- `POSTGRES_DB` - Database name (default: ws_scoring)
- `POSTGRESQL_CONNECTION_STRING` - Full connection string (optional, overrides above)
- `PORT` - API server port (default: 3000)
- `CORS_ALLOWED_ORIGIN` - CORS allowed origin (default: http://localhost:5173 for dev, http://localhost:3000 for production)
- `API_TARGET` - Target URL for Vite proxy (default: http://localhost:3000, or http://app:3000 in Docker)

> **Security Note**: For production deployments using `docker-compose.yml`, you **must** provide `POSTGRES_USER` and `POSTGRES_PASSWORD` environment variables. The production configuration does not include default values to prevent accidental use of insecure credentials. For local development, `docker-compose.dev.yml` includes default values for convenience.

## Database Management

### Reset Event Store

Reset the event store to an empty state (truncates all event tables):

```bash
bun run db:reset
```

This preserves the database and schema, only clearing the event data.

### Seed Data

Load seed data into the event store:

```bash
# Preview what will be created (dry run)
bun run db:seed:dry-run

# Actually seed the database
bun run db:seed
```

To customize seed data, edit `scripts/db/seed-data.ts`.

## Authentication

The application uses session-based authentication with cookie-based sessions. User sessions are stored in PostgreSQL and expire after 7 days.

### User Roles

Users can have one of three roles:
- **judge**: Standard judge role
- **head_judge**: Head judge role
- **administrator**: Administrator role

Roles are stored for future authorization features.

### API Endpoints

#### Public Endpoints (No Authentication Required)

- `POST /api/auth/login` - Login with username and password
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current authenticated user
- `GET /api/heats/:heatId/viewer` - Get heat viewer state (public viewing)
- `GET /api/heats/:heatId/stream` - WebSocket stream for heat updates (public)

#### Protected Endpoints (Authentication Required)

All other `/api/*` endpoints require authentication:
- `GET /api/heats` - List heats
- `POST /api/heats` - Create heat
- `GET /api/heats/:heatId` - Get heat state
- `POST /api/heats/:heatId/scores/wave` - Add wave score
- `POST /api/heats/:heatId/scores/jump` - Add jump score

### User Management Scripts

Manage users via command-line scripts:

```bash
# Create a new user (interactive)
bun run users:create

# List all users
bun run users:list

# Update a user (interactive)
bun run users:update

# Delete a user (interactive)
bun run users:delete

# Change a user's password (interactive)
bun run users:change-password
```

### Creating Your First User

After setting up the database and running migrations, create your first user:

```bash
bun run users:create-user
```

Follow the prompts to enter username, password, and role.

### Production Build

```bash
# Build the frontend
bun run build:app
```

The built files will be in the `dist/` directory. The Bun server serves these files at the `/app` route when running in production mode.

## Building and Deployment (Docker only)

```bash
docker build -t ws-scoring .
docker run -p 3000:3000 ws-scoring
```
