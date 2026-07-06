# syntax=docker/dockerfile:1.7

# ----- Stage 1: dependencies -----
# better-sqlite3 is a native module; alpine (musl) needs build tools to
# compile it from source.
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# ----- Stage 2: build -----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----- Stage 3: runtime -----
# Non-standalone: copy the full node_modules so the compiled better-sqlite3
# binary is guaranteed present, and run `next start`. Runs as root so it can
# write the SQLite file on the Fly volume mounted at /data.
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=::

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000", "-H", "::"]
