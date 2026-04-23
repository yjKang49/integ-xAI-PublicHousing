# apps/job-worker/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/job-worker/package.json ./apps/job-worker/
RUN yarn install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/job-worker ./apps/job-worker
RUN yarn workspace @ax/shared build
RUN yarn workspace @ax/job-worker build

FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/job-worker/package.json ./apps/job-worker/
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/job-worker/dist ./apps/job-worker/dist
WORKDIR /app/apps/job-worker
ENV NODE_ENV=production
CMD ["node", "dist/src/main"]
