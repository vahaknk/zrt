# Zartsants video worker: compresses uploaded platform videos with ffmpeg.
FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY worker.mjs ./
USER node
CMD ["node", "worker.mjs"]
