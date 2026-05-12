FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma migrate deploy && node dist/seed-initial.js && node dist/main.js"]
