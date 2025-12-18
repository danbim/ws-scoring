FROM oven/bun:1.3-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "run", "server.ts"]

