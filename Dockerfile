# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# We force the app to 3005 to match our code
ENV PORT=3005

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nestjs

# Explicitly expose 3005
EXPOSE 3005

CMD ["npm", "run", "start:prod"]
