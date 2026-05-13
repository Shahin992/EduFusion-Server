# 1. Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# No longer need python/make/g++ because we switched to bcryptjs
COPY package*.json ./
# Cache npm dependencies for faster builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
RUN npm prune --production

# 2. Production Stage
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3005

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
USER nestjs

EXPOSE 3005
CMD ["node", "dist/src/main"]
