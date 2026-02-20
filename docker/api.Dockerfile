# Development stage
FROM node:24-alpine AS development
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/auth/package.json ./packages/auth/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN npm ci --ignore-scripts --workspace=apps/api --workspace=packages/shared --workspace=packages/config --workspace=packages/auth

# Copy source code
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev", "--workspace=apps/api"]

# Production build stage
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/*/package.json ./packages/
COPY apps/api/package.json ./apps/api/

RUN npm ci --ignore-scripts --workspace=apps/api --workspace=packages/shared --workspace=packages/config --workspace=packages/auth

# Build stage
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN npm run build --workspace=apps/api

# Production stage
FROM node:24-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages

# Set environment
ENV NODE_ENV=production
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>{process.exit(1)})"]

EXPOSE 3000
CMD ["node", "--import", "./dist/instrumentation.js", "dist/server.js"]
