# Multi-stage build for Agent SDK API Server
# BEGINNER NOTE: Multi-stage builds keep the final image small by separating build and runtime

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy and display version for verification
COPY VERSION ./
RUN echo "=== BUILDING COMMIT ===" && cat VERSION && echo "====================="

# Copy package files
COPY package*.json ./

# Debug: Check what files we have
RUN echo "=== Files in /app ===" && ls -la && \
    echo "=== Node version ===" && node --version && \
    echo "=== NPM version ===" && npm --version && \
    echo "=== Checking package files ===" && \
    (test -f package.json && echo "✓ package.json exists" || echo "✗ package.json MISSING") && \
    (test -f package-lock.json && echo "✓ package-lock.json exists" || echo "✗ package-lock.json MISSING")

# Install dependencies (including devDependencies for building)
RUN npm ci --verbose

# Copy source code and config
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Build identity, reported by GET /health so "is the deployed code current?" is a
# check rather than an inference. CI passes the real commit as a build arg, which
# cannot drift from the source in this image. The VERSION file below is only a
# fallback for local builds that pass no args — it is hand-updated and often
# stale, so src/buildInfo.ts labels a value that came from it as such.
ARG GIT_COMMIT=""
ARG BUILD_TIME=""
ENV GIT_COMMIT=$GIT_COMMIT
ENV BUILD_TIME=$BUILD_TIME
COPY VERSION ./

# ffmpeg powers POST /render (captions, lead-in, loudness normalisation).
# ttf-dejavu matters as much as ffmpeg: libass has no font of its own, and
# without one burned-in subtitles render as empty boxes with no error.
RUN apk add --no-cache ffmpeg ttf-dejavu

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Create workspace directory for FileSystemTool and code execution
# BEGINNER NOTE: This is where the agent can read/write files and run code safely
RUN mkdir -p /app/workspace && chmod 755 /app/workspace

# Expose port (default 3000, can be overridden via environment variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run the server
CMD ["node", "dist/server.js"]
