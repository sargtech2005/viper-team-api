FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install --ignore-scripts

COPY . .

RUN cd client && npm install && npm run build

RUN npm prune --production

EXPOSE 8080

CMD ["node", "server/index.js"]
