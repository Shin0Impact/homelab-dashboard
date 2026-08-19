# Step 1: Build React Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Backend Setup & Server
FROM node:20-alpine

# Install Docker CLI and Docker Compose v2 plugin
RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server ./server
COPY --from=build-frontend /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "server/index.js"]