FROM node:20-alpine AS base
WORKDIR /app
# OpenSSL requis par Prisma sur Alpine (sinon warning + crash éventuel)
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install

FROM base AS development
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "start:dev"]

FROM base AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
