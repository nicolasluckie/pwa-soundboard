# --- build stage ---
FROM node:22-alpine AS build

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
FROM node:22-alpine AS runtime

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev && cd ..
COPY server/index.js ./server/

COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/data/demos.json ./data/demos.json
COPY --from=build /app/data/audio/demos ./data/audio/demos

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
