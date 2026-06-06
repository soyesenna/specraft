FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache g++ make python3
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/mcp-proxy/package.json packages/mcp-proxy/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY . .
RUN pnpm -r build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache git libstdc++ openssh-client
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/mcp-proxy ./packages/mcp-proxy
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/backend ./apps/backend
COPY --from=build /app/apps/frontend/dist ./apps/frontend/dist
EXPOSE 4311
CMD ["node", "apps/backend/dist/main.js"]
