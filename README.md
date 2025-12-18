# ws-scoring

A TypeScript web server built with Bun, featuring Biome for code quality.

## Features

- **Bun Runtime**: Fast JavaScript/TypeScript runtime
- **TypeScript**: Type-safe development
- **Biome**: Fast formatting and linting

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

# Format code
bun run format

# Lint code
bun run lint

# Format and lint (fixes issues automatically)
bun run check
```

## Building and Deployment

```bash
docker build -t ws-scoring .
docker run -p 3000:3000 ws-scoring
```
