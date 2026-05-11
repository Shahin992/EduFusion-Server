# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate build
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy pruned node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Switch to non-root user
USER nestjs

# Railway provides PORT, but EXPOSE 8080 helps with auto-detection
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start:prod"]
