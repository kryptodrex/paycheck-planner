# Build stage — monorepo workspace context required for shared packages
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @paycheck-planner/core run build
RUN pnpm --filter @paycheck-planner/api run build

# Runtime stage — lean image with compiled output + production dependencies
FROM node:22-alpine
RUN corepack enable
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

ENV PORT=8080
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]
