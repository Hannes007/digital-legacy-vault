# syntax=docker/dockerfile:1.7
# Digital Legacy Vault workers — multi-stage build.
# Distroless, non-root image running the compiled BullMQ workers on :4001.
# Build context is the REPO ROOT:  docker build -f apps/workers/Dockerfile -t dlv-workers .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/workers/package.json apps/workers/
COPY packages/config/package.json packages/config/
COPY packages/crypto/package.json packages/crypto/
COPY packages/shared-kernel/package.json packages/shared-kernel/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @dlv/workers... build
RUN pnpm --filter @dlv/workers deploy --prod --legacy /app

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /app/dist ./dist
COPY --from=build --chown=nonroot:nonroot /app/node_modules ./node_modules
USER nonroot
EXPOSE 4001
CMD ["dist/main.js"]
