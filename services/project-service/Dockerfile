FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY packages/database ./packages/database
COPY services/project-service ./services/project-service

RUN npm install --omit=dev
RUN npm run db:generate

EXPOSE 5002
CMD ["node", "services/project-service/server.js"]
