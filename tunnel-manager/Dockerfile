FROM cloudflare/cloudflared:latest AS cloudflared

FROM node:20-alpine

COPY --from=cloudflared /usr/local/bin/cloudflared /usr/local/bin/cloudflared

WORKDIR /app
COPY tunnel-manager/index.js /app/index.js

EXPOSE 3002
CMD ["node", "/app/index.js"]
