FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend
RUN npm install --omit=optional --workspaces --include-workspace-root
RUN npm run build -w @writeright/backend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/writeright.db
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "backend/dist/backend/src/server.js"]
