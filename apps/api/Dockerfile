# =============================================================================
# Marketplace API - Multi-stage Docker Build
# =============================================================================
# Build: docker build -t marketplace-api -f apps/api/Dockerfile .
# Run:   docker run -p 3000:3000 --env-file apps/api/.env marketplace-api
# =============================================================================
# IMPORTANT: Build from the monorepo root, not from apps/api/
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl ffmpeg

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace configuration files first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./

# Copy package.json files for all workspace packages
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies with frozen lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy Prisma schema and generate client before copying source
# (allows caching the generate step if schema hasn't changed)
COPY apps/api/prisma ./apps/api/prisma/
RUN pnpm --filter @marketplace/api exec prisma generate

# Copy source code for all packages the API depends on
COPY packages/shared ./packages/shared/
COPY packages/ui ./packages/ui/
COPY apps/api ./apps/api/

# Build shared packages first (turbo handles dependency order)
RUN pnpm --filter @marketplace/api... build

# ---------------------------------------------------------------------------
# Stage 2: Production
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat openssl ffmpeg

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy built output
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist

# Copy Prisma schema and migrations (needed for runtime and prisma migrate deploy)
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./prisma

# Copy node_modules (production dependencies are needed at runtime)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/package.json

# Copy package.json for runtime metadata
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json

# Copy generated Prisma client
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
ENV PORT=3000

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
