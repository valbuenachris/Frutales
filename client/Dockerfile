# syntax=docker/dockerfile:1
#
# Frutales web client — multi-stage build.
#
#   build target       -> node image with the Vite dev server (used by local dev)
#   production target  -> nginx serving the static bundle + /api reverse proxy

# ---------- Stage 1: build the Vite production bundle -------------------------
FROM node:20-alpine AS build
WORKDIR /app
# API base URL is injected at build time and baked into the bundle.
# "/api" makes the SPA call the nginx proxy on the same origin.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ---------- Stage 2: serve with nginx -----------------------------------------
FROM nginx:alpine AS production
# Custom config: gzip, SPA fallback, /api -> server:4000 reverse proxy.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

# nginx:alpine's default CMD runs nginx in the foreground.
