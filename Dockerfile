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

# Prune dev dependencies to keep node_modules lean for production
RUN npm prune --production

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy pruned node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
# Copy built files from builder
COPY --from=builder /app/dist ./dist
# Copy package.json for the start script
COPY package*.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3005

# Start the application
CMD ["npm", "run", "start:prod"]
