# Stage 1: Build the Vite SPA
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack and use pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package config
COPY package.json pnpm-lock.yaml ./

# Install dependencies (ignoring scripts for smooth CI)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the frontend source code
COPY . .

# Build for production
RUN pnpm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config to support React Router (SPA fallback) and reverse proxy /api to the backend
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://backend:9000/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
        \
        # Support for SSE (Server-Sent Events) \
        proxy_set_header Connection ""; \
        chunked_transfer_encoding off; \
        proxy_buffering off; \
        proxy_cache off; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
