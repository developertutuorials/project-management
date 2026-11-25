FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY packages/database ./packages/database
COPY services/user-service ./services/user-service

RUN npm install --omit=dev
RUN npm run db:generate

EXPOSE 5005
CMD ["node", "services/user-service/server.js"]
