FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY packages/database ./packages/database
COPY services/workspace-service ./services/workspace-service

RUN npm install --omit=dev
RUN npm run db:generate

EXPOSE 5001
CMD ["node", "services/workspace-service/server.js"]
