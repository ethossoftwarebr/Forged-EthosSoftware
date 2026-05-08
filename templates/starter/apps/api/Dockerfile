# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20-alpine

# ============================================================
# Stage 1: builder
# ============================================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Enable pnpm via corepack (matches monorepo packageManager).
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifest + lockfile + relevant package.jsons for dep caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY templates/starter/apps/api/package.json ./templates/starter/apps/api/

# Install all deps (dev included for build).
RUN pnpm install --frozen-lockfile

# Copy source.
COPY packages/config ./packages/config
COPY templates/starter/apps/api ./templates/starter/apps/api

# Build the api workspace.
WORKDIR /app/templates/starter/apps/api
RUN pnpm prisma generate
RUN pnpm build

# Prune dev deps for a slim runner.
WORKDIR /app
RUN pnpm install --prod --frozen-lockfile

# ============================================================
# Stage 2: runner
# ============================================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Required for HEALTHCHECK probe.
RUN apk add --no-cache wget

# Copy only what's needed at runtime.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/templates/starter/apps/api/node_modules ./templates/starter/apps/api/node_modules
COPY --from=builder /app/templates/starter/apps/api/dist ./templates/starter/apps/api/dist
COPY --from=builder /app/templates/starter/apps/api/prisma ./templates/starter/apps/api/prisma
COPY --from=builder /app/templates/starter/apps/api/package.json ./templates/starter/apps/api/package.json

WORKDIR /app/templates/starter/apps/api

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
