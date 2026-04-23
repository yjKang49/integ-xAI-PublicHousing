FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN yarn install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared then API
RUN yarn workspace @ax/shared build
RUN yarn workspace @ax/api build

# ── Runtime stage ──────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/src/main"]
