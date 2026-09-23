FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
WORKDIR /app/backend
RUN npm install --omit=dev && mkdir -p data && chown -R node:node /app/backend/data
USER node
ENV HOST=0.0.0.0 PORT=8080 DATA_DIR=/app/backend/data
EXPOSE 8080
CMD ["node", "server.mjs"]
