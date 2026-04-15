# apps/ai-worker/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/ai-worker/package.json ./apps/ai-worker/
RUN yarn install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/ai-worker ./apps/ai-worker
RUN yarn workspace @ax/shared build 2>/dev/null || true
RUN yarn workspace @ax/ai-worker build

FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/ai-worker/package.json ./apps/ai-worker/
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/ai-worker/dist ./apps/ai-worker/dist
WORKDIR /app/apps/ai-worker
ENV NODE_ENV=production
CMD ["node", "dist/src/main"]
