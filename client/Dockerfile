FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY packages/inspoclip-workspace-ui/package.json ./packages/inspoclip-workspace-ui/package.json
RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter inspoclip-client install --frozen-lockfile --prod=false
COPY client ./client
COPY packages/inspoclip-workspace-ui ./packages/inspoclip-workspace-ui
RUN pnpm --filter inspoclip-client build

FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
