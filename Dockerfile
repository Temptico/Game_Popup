# ---- build: all dependencies, compile the Remix app ----
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime: production dependencies + build output only ----
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/build ./build
COPY prisma ./prisma
COPY scripts ./scripts
EXPOSE 3000
# Applies pending migrations to the database on the volume, then starts the server.
CMD ["npm", "run", "docker-start"]
