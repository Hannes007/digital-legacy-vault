# syntax=docker/dockerfile:1.7
# Digital Legacy Vault API — multi-stage build.
# Result: a distroless, non-root image running the compiled NestJS app on :4000
# (phase-2-contracts cross-cutting rules). Build context is the REPO ROOT:
#   docker build -f apps/api/Dockerfile -t dlv-api .

# ---- base: pnpm on Node 22 (Debian, matches Prisma debian-openssl-3.0.x) ----
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /repo

# ---- deps: install the full monorepo dev+prod deps (cached on manifests) ----
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/crypto/package.json packages/crypto/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- build: compile packages + api, generate Prisma client, prune ----
FROM deps AS build
COPY . .
# Build @dlv/* packages then the API (turbo resolves the graph).
RUN pnpm --filter @dlv/api... build
# Generate the Prisma client into node_modules for the runtime stage.
RUN pnpm --filter @dlv/api exec prisma generate
# Produce a self-contained, production-only deployment of the API.
RUN pnpm --filter @dlv/api deploy --prod --legacy /app

# ---- runtime: distroless, non-root ----
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /app/prisma ./prisma
USER nonroot
EXPOSE 4000
# distroless nodejs image's entrypoint is "node"; pass the script only.
CMD ["dist/main.js"]
