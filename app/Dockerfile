# Stage 1: Build the app
FROM node:20 AS builder

WORKDIR /app

# Accept build-time environment variable
ARG VITE_S3_BUCKET
ENV VITE_S3_BUCKET=$VITE_S3_BUCKET

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the Vite app with injected env var
RUN npm run build

# Stage 2: Serve the app using `serve`
FROM node:20 AS runner

WORKDIR /app

# Install the static file server
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port `serve` will use
EXPOSE 3000

# Serve the built site
CMD ["serve", "-s", "dist", "-l", "3000"]
