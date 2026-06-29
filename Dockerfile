# --- build stage ---
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm install

COPY client/ ./client/
COPY server/ ./server/

RUN npm run build

# --- runtime stage ---
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server ./server

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
