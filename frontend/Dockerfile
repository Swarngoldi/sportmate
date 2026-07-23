# Stage 1: Build the frontend React app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build arguments
ARG VITE_GOOGLE_CLIENT_ID

# Make them available to Vite during the build
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine AS final

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]