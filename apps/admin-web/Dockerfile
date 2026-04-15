FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin-web/package.json ./apps/admin-web/

RUN yarn install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/admin-web ./apps/admin-web

RUN yarn workspace @ax/shared build 2>/dev/null || true
RUN yarn workspace @ax/admin-web build

# ── Nginx stage ────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/apps/admin-web/dist/admin-web/browser /usr/share/nginx/html
COPY apps/admin-web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
