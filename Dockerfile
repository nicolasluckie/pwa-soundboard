# --- build stage ---
FROM node:22-alpine3.22 AS build

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm install

COPY client/ ./client/
COPY server/ ./server/
COPY data/ ./data/

RUN npm run build

# --- runtime stage ---
FROM node:22-alpine3.22 AS runtime

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev && cd ..
COPY server/index.js ./server/
COPY server/db.js ./server/
COPY server/migrate-to-mongo.js ./server/

COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p data/audio data/icons

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
