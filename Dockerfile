# bots-n-cats Production Dockerfile
# Multi-stage build for optimized image size

FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy workspace packages
COPY packages/audio-core/package*.json ./packages/audio-core/
COPY packages/webhook-server/package*.json ./packages/webhook-server/
COPY packages/music-engine/package*.json ./packages/music-engine/
COPY packages/cat-sounds/package*.json ./packages/cat-sounds/
COPY packages/streaming-server/package*.json ./packages/streaming-server/

# Install all dependencies
RUN npm ci

# Copy source code
COPY packages ./packages
COPY integrated-server.ts ./

# Build all packages
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy workspace packages
COPY packages/audio-core/package*.json ./packages/audio-core/
COPY packages/webhook-server/package*.json ./packages/webhook-server/
COPY packages/music-engine/package*.json ./packages/music-engine/
COPY packages/cat-sounds/package*.json ./packages/cat-sounds/
COPY packages/streaming-server/package*.json ./packages/streaming-server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/integrated-server.ts ./

# Install tsx for running TypeScript directly
RUN npm install -g tsx

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the integrated server
CMD ["tsx", "integrated-server.ts"]
