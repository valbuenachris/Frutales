# syntax=docker/dockerfile:1
#
# Frutales API — multi-stage build.
#
#   build target       -> dev tooling image (tsx, prisma CLI, source). Used by
#                         the compose "migrate" init container and local dev.
#   production target  -> slim runtime image (production deps only, non-root).

# ---------- Stage 1: full dependency install (incl. dev deps + Prisma CLI) ----
FROM node:20-alpine AS deps
WORKDIR /app
# Prisma query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: generate Prisma client + compile TypeScript --------------
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Stage 3: production runtime (slim + non-root) ---------------------
FROM node:20-alpine AS production
# NODE_ENV keeps deps/engine in production mode; skip is a no-op here because
# the Prisma CLI is not installed, but it silences the postinstall warning.
ENV NODE_ENV=production \
    PORT=4000 \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
# Runtime dependencies only -> small image.
# --legacy-peer-deps skips @prisma/client's optional "prisma" peer, which npm
# would otherwise install (the CLI + its engine toolchain is ~155 MB and is
# not needed at runtime). The generated client is copied from the build stage.
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force
# Drop the unused WASM query engines for other databases (~53 MB); the app
# uses the native library engine that lives in node_modules/.prisma.
RUN find node_modules/@prisma/client/runtime -name '*wasm-base64*' -delete
# The generated Prisma client (including the query engine binary) comes from
# the build stage so no Prisma CLI is needed in the runtime image.
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "dist/index.js"]
