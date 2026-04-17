# syntax=docker/dockerfile:1.7

# ----- Base image with pnpm -----
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ \
  && corepack enable \
  && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ----- Install dependencies (cached layer) -----
FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile=false

# ----- Build shared, then web and server -----
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/web ./packages/web
RUN pnpm --filter @3d-space-pong/shared run build \
 && pnpm --filter @3d-space-pong/web run build \
 && pnpm --filter @3d-space-pong/server run build

# ----- Runtime image (slim) -----
FROM node:20-alpine AS runtime
RUN apk add --no-cache tini \
  && corepack enable \
  && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_DRIVER=sqlite \
    DB_URL=file:/app/data/pong.db

# Copy package manifests and install only production deps for the server.
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --prod --frozen-lockfile=false --filter @3d-space-pong/server...

# Copy compiled shared, compiled server, and built web bundle.
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/src/db/migrations ./packages/server/dist/db/migrations
COPY --from=build /app/packages/web/dist ./packages/web/dist

VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

WORKDIR /app/packages/server
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
