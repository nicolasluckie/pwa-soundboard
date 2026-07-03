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
FROM node:22-alpine AS runtime

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev && cd ..
COPY server/index.js ./server/

COPY --from=build /app/client/dist ./client/dist

# Ensure samples directory is writable for uploads
RUN mkdir -p /app/client/dist/samples && chmod 777 /app/client/dist/samples

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
