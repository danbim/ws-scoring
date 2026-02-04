# ws-scoring

A windsurfing wave contest judging application built with PostgreSQL and Bun. This system handles heat creation and score recording (waves and jumps) for windsurfing competitions.

## ⚠️ DISCLAIMER ⚠️

This is an experiment for learning / improving in agentic coding. While I aim to eventually actually use the system for
running Windsurfing contests (hopefully in the Danish Open in Spring 2026), the current focus lies on agentic coding.

Don't expect to find production level code here and don't assume this is how I would code. This whole thing may end up
production ready or completely messy as I'm collecting experiences here, especially with respect to the question of how
close I'll have to keep an eye on what the AI genie is doing. For this I might even let it run farther than I would in
a real project.

Currently, I also intentionally don't focus on clean/component-based/reusable/testable frontend code (it is messy what
the genie generated so far). This is fine ;) as I'll eventually throw it away and rebuild once I got user feedback.

## See It In Action

Check out the [WS Scoring Landing Page](https://danbim.github.io/ws-scoring/) to see the app in action with screenshots for judges, head judges, and spectators.

## Features

- **PostgreSQL Database**: Relational database with Drizzle ORM for type-safe queries
- **Authentication**: Session-based authentication with role-based access control (judge, head_judge, administrator)
- **User Management**: Scripts for creating, updating, and managing users
- **Frontend Application**: SolidJS single-page application with Tailwind CSS
- **Bun Runtime**: Fast JavaScript/TypeScript runtime
- **TypeScript**: Type-safe development
- **Biome**: Fast formatting and linting
- **Test-Driven Development**: Comprehensive test coverage with unit and integration tests using PGlite

## Prerequisites

- [Bun](https://bun.sh) installed
- [Docker](https://www.docker.com) installed (for building images)
- [PostgreSQL](https://www.postgresql.org/) database

## Getting Started

### Install Dependencies

```bash
bun install
```

### Database Setup

The application uses PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) for data persistence.

Make sure you have a PostgreSQL instance running, e.g. by starting a corresponding Docker container:

```bash
docker run -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ws_scoring -p 5432:5432 postgres:18-alpine
```

Configure the database connection using environment variables (or copy `.env.example` to `.env`):

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=user
export POSTGRES_PASSWORD=password
export POSTGRES_DB=ws_scoring
```

`POSTGRES_HOST` defaults to `localhost` and `POSTGRES_PORT` defaults to `5432` if not provided.

#### Drizzle Database Migrations

The application uses Drizzle ORM for database schema management. To set up the database schema:

```bash
# Generate migration files from schema changes
bun run db:generate

# Apply migrations to the database
bun run db:migrate
```

This will create all necessary tables including `users`, `sessions`, `heats`, `scores`, `brackets`, and more.

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

Run tests with:

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

The heat scoring system uses a **service layer pattern** with:

- **HeatService**: Business logic for heat operations
- **Repository Pattern**: Clean separation between domain and data access
- **PostgreSQL Transactions**: ACID guarantees for data consistency
- **Type Safety**: Full TypeScript type checking throughout

### Scoring Operations

- **Create Heat**: Initialize a new heat with riders and scoring rules
- **Add Wave Score**: Record a wave score (0-10 scale) for a rider
- **Add Jump Score**: Record a jump score (0-10 scale) with jump type and modifiers
- **Complete Heat**: Mark heat as completed and trigger bracket progression

#### Jump Types

Supported jump types: `forward`, `backloop`, `doubleForward`, `pushLoop`, `pushForward`, `tableTop`, `cheeseRoll`

## Bracket Generation

### Single Elimination Brackets

The system supports Single Elimination bracket generation for contest divisions following PWA rules:
- 2-64 riders supported
- Random seeding
- Automatic bye handling for non-power-of-2 participant counts
- Parallel heats (1a/1b format)
- Semi-finals feed both finals (runners-up final and final)
- Automatic heat progression when heats are completed

### API Endpoints

#### Generate Bracket
POST /api/divisions/:divisionId/brackets/generate
Content-Type: application/json

{
  "format": "single_elimination"
}

#### Get Bracket Structure
GET /api/brackets/:bracketId

Returns complete bracket structure with rounds and heats.

#### Complete Heat
POST /api/heats/:heatId/complete
Content-Type: application/json

{}

Triggers automatic rider advancement through bracket.

### Bracket Progression

When a heat is completed:
1. Winner and loser are determined from scores
2. Winner advances to winner destination heat
3. Loser advances to loser destination (semi-finals only)
4. If destination heat receives only 1 rider (bye), it auto-completes
5. Cascade continues until a heat needs 2 riders

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

- `POSTGRES_HOST` - PostgreSQL hostname (default: localhost)
- `POSTGRES_PORT` - PostgreSQL port (default: 5432)
- `POSTGRES_USER` - PostgreSQL username (required for production, no default)
- `POSTGRES_PASSWORD` - PostgreSQL password (required for production, no default)
- `POSTGRES_DB` - Database name (default: ws_scoring)
- `PORT` - API server port (default: 3000)
- `CORS_ALLOWED_ORIGIN` - CORS allowed origin (default: http://localhost:5173 for dev, http://localhost:3000 for production)
- `API_TARGET` - Target URL for Vite proxy (default: http://localhost:3000, or http://app:3000 in Docker)

> **Security Note**: For production deployments using `docker-compose.yml`, you **must** provide `POSTGRES_USER` and `POSTGRES_PASSWORD` environment variables. The production configuration does not include default values to prevent accidental use of insecure credentials. For local development, `docker-compose.dev.yml` includes default values for convenience.

## Database Management

### Reset Database

Reset the database to an empty state (truncates all tables):

```bash
bun run db:reset
```

This preserves the database schema, only clearing the data.

### Seed Data

Load seed data into the database:

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
bun run users:create
```

Follow the prompts to enter username, password, and role.

### Production Build

```bash
# Build the frontend
bun run build:app
```

The built files will be in the `dist/` directory. The Bun server serves these files at the `/app` route when running in production mode.

## Live Heat Viewer

The application includes a standalone web component for viewing live heat updates. This viewer is designed for public display (e.g., on screens at the beach) and does not require authentication.

### Accessing the Viewer

With the API server running:

```
http://localhost:3000/viewer
```

### Using the Web Component

The viewer is available as a custom web component that can be embedded in any HTML page:

```html
<heat-viewer heat-id="29a"></heat-viewer>
<script type="module" src="/viewer/heat-viewer.js"></script>
```

### Features

- **Real-time Updates**: Automatically connects to the WebSocket stream for live score updates
- **Public Access**: No authentication required - perfect for public displays
- **Auto Reconnect**: Automatically reconnects if the connection is lost
- **Responsive Design**: Works on screens of all sizes

### Example Usage

To view heat "29a":
1. Start the API server: `bun run dev:api`
2. Navigate to: `http://localhost:3000/viewer`
3. The page displays the configured heat ID (default: "29a")
4. To view a different heat, modify the `heat-id` attribute in `src/viewer/index.html`

## Scaleway Serverless Deployment

The application deploys to Scaleway as a serverless stack with auto-scaling from 0 to 1 instance.

### Architecture

- **Scaleway Serverless Container**: Hosts the application (auto-scales)
- **Scaleway Serverless SQL Database**: PostgreSQL with scale-to-zero
- **Infrastructure as Code**: Managed with OpenTofu
- **Continuous Deployment**: GitHub Actions on push to `main`

### Setup

See [Scaleway Setup Guide](docs/scaleway-setup.md) for detailed setup instructions.

Quick start:
```bash
# Install tools
brew install opentofu scw

# Authenticate
scw init

# Create state bucket
scw object bucket create name=ws-scoring-tfstate region=fr-par

# Configure GitHub Secrets (see setup guide)

# Push to main - infrastructure and app deploy automatically
git push origin main
```

### Deployment Workflows

- **Infrastructure**: `.github/workflows/infrastructure.yml` - Runs when `infrastructure/` changes
- **Application**: `.github/workflows/deploy.yml` - Runs on push to `main`

### Cost

Expected: ~€0.67/month for ~10 hours of usage with scale-to-zero.

## Building and Deployment (Docker only - Legacy)

For local Docker builds:

```bash
docker build -t ws-scoring .
docker run -p 8080:8080 ws-scoring
```
