# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/i18n/package.json packages/i18n/
COPY packages/schemas/package.json packages/schemas/
COPY packages/engine/package.json packages/engine/
COPY packages/fix-library/package.json packages/fix-library/
COPY packages/air-adapters/package.json packages/air-adapters/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter @airdelta/api...

COPY packages ./packages
COPY apps/api ./apps/api
COPY fixtures ./fixtures

RUN pnpm --filter @airdelta/api... run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/fixtures ./fixtures

EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
