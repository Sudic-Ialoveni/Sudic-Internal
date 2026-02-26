# Sudic Internal – backend (Express API) for homelab / Docker
# Build: docker build -t sudic-internal-backend -f backend/Dockerfile backend/
# Run:   docker run -p 3001:3001 --env-file backend/.env sudic-internal-backend

FROM node:20-alpine AS builder

WORKDIR /app

# Install deps and build
COPY package.json package-lock.json* ./
RUN npm ci
COPY build.mjs ./
COPY src ./src
COPY tsconfig.json ./
RUN node build.mjs && npm prune --production

# Production image
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

USER node
CMD ["node", "dist/index.js"]
