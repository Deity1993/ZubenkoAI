# Stage 1: Build Frontend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Server + Dependencies
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/*.js ./server/
COPY server/scripts ./server/scripts/
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

VOLUME /app/server/data
CMD ["node", "index.js"]
