FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY libs ./libs
COPY apps/tracking-service ./apps/tracking-service

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @logistics/tracking-service prisma:generate
RUN pnpm --filter @logistics/tracking-service build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY libs ./libs
COPY apps/tracking-service ./apps/tracking-service

RUN pnpm install --no-frozen-lockfile --prod=false
RUN pnpm --filter @logistics/tracking-service prisma:generate

EXPOSE 3002
CMD ["pnpm", "--filter", "@logistics/tracking-service", "start"]
