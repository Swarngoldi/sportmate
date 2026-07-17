# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and serve the application
FROM node:18-alpine AS final
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --production

# Copy backend source code
COPY backend/ ./

# Copy built frontend assets from the frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./public

# Set default port
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
