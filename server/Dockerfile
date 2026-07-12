FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ ffmpeg
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && apk del python3 make g++
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads videos
EXPOSE 3001
CMD ["node", "dist/index.js"]
