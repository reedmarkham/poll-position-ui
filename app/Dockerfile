# Stage 1: Build the app
FROM node:20 AS builder

WORKDIR /app

# Inject Vite environment variable
ARG VITE_S3_BUCKET
ENV VITE_S3_BUCKET=$VITE_S3_BUCKET

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Debug log to verify the env value is passed correctly
RUN echo "🌱 VITE_S3_BUCKET at build: $VITE_S3_BUCKET"

# Build the Vite app (uses import.meta.env.VITE_S3_BUCKET)
RUN npm run build

# Stage 2: Serve the built app
FROM node:20 AS runner

WORKDIR /app

# Install the static file server
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port serve uses
EXPOSE 3000

# Serve the built site
CMD ["serve", "-s", "dist", "-l", "3000"]
