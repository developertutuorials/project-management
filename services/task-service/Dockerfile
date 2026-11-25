FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY packages/database ./packages/database
COPY packages/event-bus ./packages/event-bus
COPY services/task-service ./services/task-service

RUN npm install --omit=dev
RUN npm run db:generate

EXPOSE 5003
CMD ["node", "services/task-service/server.js"]
