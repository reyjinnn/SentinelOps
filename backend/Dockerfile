# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace and lock files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build the TypeScript project
RUN pnpm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy compiled outputs from builder
COPY --from=builder /app/dist ./dist

EXPOSE 9000

# Set Node environment
ENV NODE_ENV=production

# Start the Fastify server and worker
CMD ["node", "dist/index.js"]
