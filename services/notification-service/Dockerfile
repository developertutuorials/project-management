FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY packages/database ./packages/database
COPY services/notification-service ./services/notification-service

RUN npm install --omit=dev
RUN npm run db:generate

EXPOSE 5004
CMD ["node", "services/notification-service/server.js"]
