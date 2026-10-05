FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY src/ ./src/

RUN mkdir -p /app/storage && chown -R node:node /app/storage

USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
