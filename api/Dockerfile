# Build from the repo root:  docker build -f apps/api/Dockerfile -t hbs-api .
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --include-workspace-root=false
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main.js"]
# one-off tasks use the same image:  npx prisma migrate deploy && npx ts-node prisma/seed.ts
