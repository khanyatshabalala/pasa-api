# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all deps (including devDeps needed for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production image ──────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only copy what's needed to run
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install production deps only
RUN npm ci --omit=dev

# Generate Prisma client in production image
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

# Run migrations then start the server
CMD ["node", "dist/main"]
