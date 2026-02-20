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

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (default 3000, can be overridden via environment variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run the server
CMD ["node", "dist/server.js"]
