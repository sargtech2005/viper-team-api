FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

RUN cd client && npm install && npm run build

RUN npm prune --production

EXPOSE 8080

CMD ["node", "app.js"]
