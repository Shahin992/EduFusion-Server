# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install build dependencies for native modules (like bcrypt)
RUN apk add --no-cache python3 make g++

# Use npm ci for faster, more reliable builds
RUN npm ci

# Set memory limit for build process
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy source code and config
COPY . .

# Generate build
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user and group
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy package files
COPY package*.json ./

# Install build dependencies for native modules in production
RUN apk add --no-cache python3 make g++

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3005

# Start the application
CMD ["npm", "run", "start:prod"]
