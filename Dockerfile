# syntax=docker/dockerfile:1


# -----------------------
# Base image with npm
# -----------------------
FROM node:20-alpine AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install minimal OS deps needed by Next.js runtime and healthcheck
RUN apk add --no-cache libc6-compat curl tini

# -----------------------
# Dependencies cache
# -----------------------
FROM base AS deps
ENV NODE_ENV=development
# Copy only lockfiles to maximize layer cache
COPY package.json package-lock.json ./
# Install all deps (including dev for building)
RUN npm ci

# -----------------------
# Build the application
# -----------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the project files
COPY . .
# Build Next.js (app router). Assumes "build" script exists in package.json
RUN npm run build

# -----------------------
# Runtime (final) stage - must be named "app" to match docker-compose target
# -----------------------
FROM base AS app
# Create unprivileged user and take ownership
RUN adduser -D -H -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Copy runtime artifacts
# NOTE: We copy node_modules from deps and the built .next output from builder.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
# Optional (only if present)
# COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Expose the port Next.js listens on
EXPOSE 3000

# Health check to match docker-compose (or ELB/App Service)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Environment variables that will be provided at runtime (do not hardcode secrets here)
# These defaults are safe no-ops for local builds; override via docker run / compose / cloud config.
ENV NEXT_PUBLIC_ENABLE_SOCKET=false
ENV TURNSTILE_SITE_KEY=""
ENV TURNSTILE_SECRET_KEY=""

# Use tini as the init to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the app
CMD ["npm", "start"]
